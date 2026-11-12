// In-memory catalog of lightweight entity records plus the search index. Loaded lazily from IndexedDB.
import type MiniSearch from 'minisearch';
import { db, getMeta } from './db';
import { loadIndex, type EntityMeta } from './search';
import type { Edition } from './edition';
import type { LinkTarget } from './tags';

export interface Catalog {
  list: EntityMeta[];
  byId: Map<string, EntityMeta>;
  byName: Map<string, EntityMeta[]>; // `${type}|${name}` lowercased
  index: MiniSearch;
  sourceNames: Record<string, string>;
}

let cached: Catalog | null = null;
let loading: Promise<Catalog | null> | null = null;

export const getCatalog = () => cached;
export const resetCatalog = () => {
  cached = null;
  loading = null;
};

export function ensureCatalog(): Promise<Catalog | null> {
  if (cached) return Promise.resolve(cached);
  loading ??= (async () => {
    const [list, indexJson, sourceNames] = await Promise.all([
      getMeta<EntityMeta[]>('entityList'),
      getMeta<string>('searchIndex'),
      getMeta<Record<string, string>>('sourceNames')
    ]);
    if (!list || !indexJson) return null;
    const byId = new Map<string, EntityMeta>();
    const byName = new Map<string, EntityMeta[]>();
    for (const m of list) {
      byId.set(m.id, m);
      const k = `${m.type}|${m.name}`.toLowerCase();
      byName.set(k, [...(byName.get(k) ?? []), m]);
    }
    cached = { list, byId, byName, index: loadIndex(indexJson), sourceNames: sourceNames ?? {} };
    return cached;
  })();
  return loading;
}

/** Finds the entity a link points at. Falls back to a same-name match when the tag named no source. */
export function resolveLink(t: LinkTarget, prefer?: Edition): string | null {
  const c = cached;
  if (!c) return null;
  if (c.byId.has(t.id)) return t.id;
  if (t.explicitSource) return null;
  const same = c.byName.get(`${t.type}|${t.name}`.toLowerCase());
  if (!same?.length) return null;
  return (same.find((m) => m.edition === prefer) ?? same[0]).id;
}

export const loadEntity = (id: string) => db.entities.get(id);
