import { ABILITIES, SIZES } from './format';
import type { Entity } from './pipeline';
import type { Obj } from './resolve';

// Side-by-side comparison of book entries (species for now). Pure functions: no database, no Svelte.

const NONE = '\u2014';

export interface ComparisonColumn {
  id: string;
  name: string;
  source: string; // book code, e.g. VGM
  sourceName: string; // full book title when known
  edition: string;
}

export interface FactRow {
  label: string;
  values: string[]; // one per column
  differs: boolean;
}

export interface TraitRow {
  key: string;
  name: string;
  present: boolean[]; // one per column
  entries: (unknown | undefined)[]; // the book entry for each column that has the trait
  differs: boolean;
}

export interface Comparison {
  columns: ComparisonColumn[];
  facts: FactRow[];
  traits: TraitRow[];
}

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const abilityName = (k: string) => ABILITIES[k] ?? k.toUpperCase();
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function abilityText(options: unknown): string {
  if (!Array.isArray(options)) return '';
  return options
    .map((o) => {
      if (!isObj(o)) return '';
      const parts = Object.entries(o).filter(([k]) => ABILITIES[k]).map(([k, v]) => `${abilityName(k)} ${signed(v as number)}`);
      const c = o.choose;
      if (isObj(c)) {
        if (isObj(c.weighted)) parts.push(`${(c.weighted.weights as number[]).map(signed).join(', ')} to scores of your choice`);
        else {
          const from = (c.from as string[] | undefined) ?? [];
          const count = c.count ?? 1;
          parts.push(`${signed(c.amount ?? 1)} to ${count} ${count === 1 ? 'score' : 'scores'} (${from.length >= 6 ? 'any' : from.map(abilityName).join('/')})`);
        }
      }
      return parts.join(', ');
    })
    .filter(Boolean)
    .join(' or ');
}

function speedText(s: unknown): string {
  if (typeof s === 'number') return `${s} ft.`;
  if (!isObj(s)) return '';
  const keys = Object.keys(s);
  if (keys.length === 1 && keys[0] === 'walk' && typeof s.walk === 'number') return `${s.walk} ft.`;
  return Object.entries(s)
    .map(([k, v]) => (typeof v === 'number' ? `${k} ${v} ft.` : v === true ? `${k} (equal to walking)` : k))
    .join(', ');
}

/** Skills, languages and similar: a list of alternatives, each an object of `key: true | count`. */
function proficiencyText(options: unknown): string {
  if (!Array.isArray(options)) return '';
  return options
    .map((o) => {
      if (!isObj(o)) return '';
      return Object.entries(o)
        .map(([k, v]) => {
          if (k === 'choose' && isObj(v)) return `choose ${v.count ?? 1} from ${((v.from as string[]) ?? []).map(cap).join(', ')}`;
          if (k === 'any' || k === 'anyStandard') return `${v} of your choice`;
          if (k === 'other') return 'one other';
          if (typeof v === 'number') return `${v} ${cap(k)}`;
          return v ? cap(k) : '';
        })
        .filter(Boolean)
        .join(', ');
    })
    .filter(Boolean)
    .join(' or ');
}

const listText = (v: unknown) => (Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? cap(x) : isObj(x) ? 'choice' : '')).filter(Boolean).join(', ') : '');
const featText = (v: unknown) =>
  Array.isArray(v)
    ? v
        .map((o) => Object.keys(isObj(o) ? o : {}).map((k) => (k === 'any' ? 'one of your choice' : cap(k.split('|')[0]))).join(', '))
        .filter(Boolean)
        .join(' or ')
    : '';

const FACTS: [string, (j: Obj) => string][] = [
  ['Creature type', (j) => listText(j.creatureTypes)],
  ['Size', (j) => (Array.isArray(j.size) ? j.size.map((s: string) => SIZES[s] ?? s).join(' or ') : '')],
  ['Speed', (j) => speedText(j.speed)],
  ['Ability scores', (j) => abilityText(j.ability)],
  ['Darkvision', (j) => (typeof j.darkvision === 'number' ? `${j.darkvision} ft.` : '')],
  ['Skills', (j) => proficiencyText(j.skillProficiencies)],
  ['Languages', (j) => proficiencyText(j.languageProficiencies)],
  ['Resistances', (j) => listText(j.resist)],
  ['Feat', (j) => featText(j.feats)]
];

/**
 * Named entries that only repeat a fact row, or are flavour text, are left out of the trait list
 * so differences in mechanics stand out.
 */
const SKIPPED_TRAITS = new Set(['size', 'speed', 'darkvision', 'languages', 'language', 'creature type', 'ability score increase', 'age', 'alignment']);

const traitsOf = (e: Entity): { key: string; name: string; entry: unknown }[] =>
  (Array.isArray(e.json.entries) ? e.json.entries : [])
    .filter((x: unknown): x is Obj => isObj(x) && typeof x.name === 'string')
    .map((x: Obj) => ({ key: x.name.trim().toLowerCase(), name: x.name.trim(), entry: x }))
    .filter((t: { key: string }) => !SKIPPED_TRAITS.has(t.key));

export function buildComparison(entities: Entity[], sourceName: (source: string) => string = (s) => s): Comparison {
  const columns = entities.map((e) => ({ id: e.id, name: e.name, source: e.source, sourceName: sourceName(e.source), edition: e.edition }));

  const facts: FactRow[] = [];
  for (const [label, read] of FACTS) {
    const values = entities.map((e) => read(e.json) || NONE);
    if (values.every((v) => v === NONE)) continue;
    facts.push({ label, values, differs: new Set(values).size > 1 });
  }

  const perColumn = entities.map(traitsOf);
  const order: { key: string; name: string }[] = [];
  for (const list of perColumn) for (const t of list) if (!order.some((o) => o.key === t.key)) order.push({ key: t.key, name: t.name });
  const traits: TraitRow[] = order.map(({ key, name }) => {
    const entries = perColumn.map((list) => list.find((t) => t.key === key)?.entry);
    const present = entries.map((x) => x !== undefined);
    return { key, name, present, entries, differs: !present.every(Boolean) };
  });

  return { columns, facts, traits };
}
