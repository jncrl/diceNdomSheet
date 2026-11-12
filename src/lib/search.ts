import MiniSearch from 'minisearch';
import type { Entity } from './pipeline';
import { flattenEntries } from './tags';

export type EntityMeta = Pick<Entity, 'id' | 'type' | 'name' | 'source' | 'edition' | 'level' | 'school' | 'classes'>;

const OPTIONS = {
  fields: ['name', 'text'],
  idField: 'id',
  // Fuzzy matching on short words matches far too much, so it only applies to longer terms.
  searchOptions: { boost: { name: 4 }, prefix: true, fuzzy: (term: string) => (term.length > 4 ? 0.2 : false), combineWith: 'AND' as const }
};

/** Builds the search index. Doc ids are positions in `list`, which keeps the stored index small. */
export function buildSearch(entities: Entity[]): { list: EntityMeta[]; indexJson: string } {
  const list: EntityMeta[] = [];
  const ms = new MiniSearch(OPTIONS);
  const docs = entities.map((e, id) => {
    list.push({ id: e.id, type: e.type, name: e.name, source: e.source, edition: e.edition, level: e.level, school: e.school, classes: e.classes });
    return { id, name: e.name, text: flattenEntries(e.json.entries ?? e.json.entry).join(' ') };
  });
  ms.addAll(docs);
  return { list, indexJson: JSON.stringify(ms) };
}

export const loadIndex = (indexJson: string) => MiniSearch.loadJSON(indexJson, OPTIONS);

export interface Filter {
  types: string[];
  edition: 'all' | '2014' | '2024';
  source: string;
  level: string; // '' or '0'..'9'
  school: string;
  className: string;
}

export function matches(m: EntityMeta, f: Filter): boolean {
  if (!f.types.includes(m.type)) return false;
  if (f.edition !== 'all' && m.edition !== f.edition) return false;
  if (f.source && m.source !== f.source) return false;
  if (f.level !== '' && m.level !== Number(f.level)) return false;
  if (f.school && m.school !== f.school) return false;
  if (f.className && !m.classes?.includes(f.className)) return false;
  return true;
}

export function runSearch(ms: MiniSearch, list: EntityMeta[], query: string, f: Filter): EntityMeta[] {
  const q = query.trim();
  if (!q) {
    const all = list.filter((m) => matches(m, f));
    const spells = f.types.length === 1 && f.types[0] === 'spell';
    return all.sort((a, b) => (spells ? (a.level ?? 0) - (b.level ?? 0) : 0) || a.name.localeCompare(b.name));
  }
  const lq = q.toLowerCase();
  // Names that start with what was typed come first, then MiniSearch's own relevance order.
  const bonus = (m: EntityMeta) => (m.name.toLowerCase().startsWith(lq) ? 2 : 1);
  return ms
    .search(q, { filter: (r) => matches(list[r.id as number], f) })
    .map((r) => ({ m: list[r.id as number], score: r.score * bonus(list[r.id as number]) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.m);
}
