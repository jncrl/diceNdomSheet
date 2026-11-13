import { ABILITIES, SIZES } from './format';
import type { Entity } from './pipeline';
import type { Obj } from './resolve';

// Side-by-side comparison of book entries (species and backgrounds). Pure functions: no database, no Svelte.

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
// Capitalises word starts but not after an apostrophe (Calligrapher's, not Calligrapher'S).
const cap = (s: string) => s.replace(/(^|[\s(/;-])([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase());
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
        if (isObj(c.weighted)) {
          const from = (c.weighted.from as string[] | undefined) ?? [];
          parts.push(`${(c.weighted.weights as number[]).map(signed).join(', ')} to ${from.length >= 6 ? 'scores of your choice' : from.map(abilityName).join('/')}`);
        }
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
          if (/^any[A-Z]/.test(k) && typeof v === 'number') return `${v} ${k.slice(3).replace(/([A-Z])/g, ' $1').trim().toLowerCase()} of your choice`;
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
        .map((o) => Object.keys(isObj(o) ? o : {}).map((k) => (k.startsWith('any') ? 'a feat of your choice' : cap(k.split('|')[0]))).join(', '))
        .filter(Boolean)
        .join(' or ')
    : '';

const gold = (copper: number) => `${copper / 100} gp`;
const EQUIPMENT_TYPES: Record<string, string> = {
  toolArtisan: "an artisan's tool", toolGaming: 'a gaming set', toolMusical: 'a musical instrument',
  weaponSimple: 'a simple weapon', weaponMartial: 'a martial weapon', instrumentMusical: 'a musical instrument', setGaming: 'a gaming set'
};

function equipmentPiece(x: unknown): string {
  if (typeof x === 'string') return x.split('|')[0];
  if (!isObj(x)) return '';
  const quantity = typeof x.quantity === 'number' && x.quantity > 1 ? `${x.quantity} ` : '';
  if (typeof x.item === 'string') return `${quantity}${x.displayName ?? x.item.split('|')[0]}`;
  if (typeof x.special === 'string') return `${quantity}${x.special}`;
  if (typeof x.equipmentType === 'string') return EQUIPMENT_TYPES[x.equipmentType] ?? x.equipmentType.replace(/([A-Z])/g, ' $1').toLowerCase();
  if (typeof x.value === 'number') return gold(x.value);
  if (typeof x.worthValue === 'number') return gold(x.worthValue);
  return '';
}

/** Starting equipment: always-included items, then the lettered either/or packages. */
function equipmentText(groups: unknown): string {
  if (!Array.isArray(groups)) return '';
  return groups
    .map((g) => {
      if (!isObj(g)) return '';
      const list = (v: unknown) => (Array.isArray(v) ? v.map(equipmentPiece).filter(Boolean).join(', ') : '');
      const always = list(g._);
      const options = Object.keys(g).filter((k) => k !== '_').sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      const choices = options.map((k) => `(${k.toUpperCase()}) ${list(g[k])}`).join(' or ');
      return [always, choices].filter(Boolean).join('; ');
    })
    .filter(Boolean)
    .join('; ');
}

const FACT_LISTS: Record<string, [string, (j: Obj) => string][]> = {
  race: [
    ['Creature type', (j) => listText(j.creatureTypes)],
    ['Size', (j) => (Array.isArray(j.size) ? j.size.map((s: string) => SIZES[s] ?? s).join(' or ') : '')],
    ['Speed', (j) => speedText(j.speed)],
    ['Ability scores', (j) => abilityText(j.ability)],
    ['Darkvision', (j) => (typeof j.darkvision === 'number' ? `${j.darkvision} ft.` : '')],
    ['Skills', (j) => proficiencyText(j.skillProficiencies)],
    ['Tools', (j) => proficiencyText(j.toolProficiencies)],
    ['Languages', (j) => proficiencyText(j.languageProficiencies)],
    ['Resistances', (j) => listText(j.resist)],
    ['Feat', (j) => featText(j.feats)]
  ],
  background: [
    ['Ability scores', (j) => abilityText(j.ability)],
    ['Feat', (j) => featText(j.feats)],
    ['Skills', (j) => proficiencyText(j.skillProficiencies)],
    ['Tools', (j) => proficiencyText(j.toolProficiencies)],
    ['Languages', (j) => proficiencyText(j.languageProficiencies)],
    ['Equipment', (j) => equipmentText(j.startingEquipment)]
  ]
};

/**
 * Named entries that only repeat a fact row, or are flavour text, are left out of the trait list
 * so differences in mechanics stand out.
 */
const SKIPPED_TRAITS = new Set([
  'size', 'speed', 'darkvision', 'languages', 'language', 'creature type', 'ability score increase', 'age', 'alignment',
  'suggested characteristics', 'specialty'
]);

const traitsOf = (e: Entity): { key: string; name: string; entry: unknown }[] =>
  (Array.isArray(e.json.entries) ? e.json.entries : [])
    .filter((x: unknown): x is Obj => isObj(x) && typeof x.name === 'string')
    .map((x: Obj) => ({ key: x.name.trim().toLowerCase(), name: x.name.trim(), entry: x }))
    .filter((t: { key: string }) => !SKIPPED_TRAITS.has(t.key));

export function buildComparison(entities: Entity[], sourceName: (source: string) => string = (s) => s): Comparison {
  const columns = entities.map((e) => ({ id: e.id, name: e.name, source: e.source, sourceName: sourceName(e.source), edition: e.edition }));

  const facts: FactRow[] = [];
  for (const [label, read] of FACT_LISTS[entities[0]?.type] ?? FACT_LISTS.race) {
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
