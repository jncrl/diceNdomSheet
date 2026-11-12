import { entityId, type Obj } from './resolve';
import { linkTarget } from './tags';

export const SCHOOLS: Record<string, string> = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment',
  V: 'Evocation', I: 'Illusion', N: 'Necromancy', T: 'Transmutation', P: 'Psionic'
};

export const ABILITIES: Record<string, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
};

const SIZES: Record<string, string> = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan', V: 'Varies' };

export const TYPE_LABELS: Record<string, string> = {
  spell: 'Spell', class: 'Class', subclass: 'Subclass', race: 'Species', subrace: 'Subrace', background: 'Background',
  feat: 'Feat', item: 'Item', itemGroup: 'Item group', baseitem: 'Base item', magicvariant: 'Item variant',
  variantrule: 'Rule', action: 'Action', condition: 'Condition', disease: 'Disease', status: 'Status', skill: 'Skill',
  sense: 'Sense', optionalfeature: 'Option', classFeature: 'Class feature', subclassFeature: 'Subclass feature'
};

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);
const footUnit = (u: string) => (u === 'feet' ? 'foot' : u === 'miles' ? 'mile' : u);

export function levelSchool(s: Obj): string {
  const school = SCHOOLS[s.school] ?? s.school ?? '';
  return s.level === 0 ? `${school} cantrip` : `Level ${s.level} ${school}`;
}

export function castingTime(time: Obj[] = []): string {
  return time
    .map((t) => `${t.number} ${t.unit}${t.condition ? `, ${t.condition}` : ''}`)
    .join(' or ');
}

export function spellRange(r: Obj | undefined): string {
  if (!r) return '';
  const d = r.distance;
  const amt = d?.amount;
  if (['radius', 'sphere', 'cone', 'line', 'cube', 'hemisphere', 'cylinder'].includes(r.type) && amt) {
    return `Self (${amt}-${footUnit(d.type)} ${r.type})`;
  }
  if (!d) return r.type === 'special' ? 'Special' : '';
  if (d.type === 'self') return 'Self';
  if (d.type === 'touch') return 'Touch';
  if (d.type === 'sight') return 'Sight';
  if (d.type === 'unlimited') return 'Unlimited';
  return `${amt} ${d.type}`;
}

export function spellComponents(c: Obj = {}): string {
  const parts: string[] = [];
  if (c.v) parts.push('V');
  if (c.s) parts.push('S');
  if (c.m) parts.push(`M (${typeof c.m === 'string' ? c.m : c.m.text})`);
  return parts.join(', ');
}

export function spellDuration(dur: Obj[] = []): string {
  return dur
    .map((d) => {
      if (d.type === 'instant') return 'Instantaneous';
      if (d.type === 'permanent') return 'Until dispelled';
      if (d.type === 'special') return 'Special';
      if (d.type === 'timed') {
        const { amount, type } = d.duration;
        const base = `${d.duration.upTo ? 'Up to ' : ''}${amount} ${plural(amount, type)}`;
        return d.concentration ? `Concentration, up to ${amount} ${plural(amount, type)}` : base;
      }
      return '';
    })
    .filter(Boolean)
    .join(' or ');
}

export const hitDie = (c: Obj) => (c.hd ? `d${c.hd.faces}` : '');
export const saves = (c: Obj) => (c.proficiency ?? []).map((a: string) => ABILITIES[a] ?? a).join(', ');

export function speciesFacts(r: Obj): [string, string][] {
  const out: [string, string][] = [];
  if (r.size) out.push(['Size', r.size.map((s: string) => SIZES[s] ?? s).join(' or ')]);
  if (typeof r.speed === 'number') out.push(['Speed', `${r.speed} ft.`]);
  else if (r.speed) out.push(['Speed', Object.entries(r.speed).map(([k, v]) => `${k} ${typeof v === 'number' ? v : ''}`.trim() + (typeof v === 'number' ? ' ft.' : '')).join(', ')]);
  if (r.ability?.length) {
    const a = r.ability[0];
    const fixed = Object.entries(a).filter(([k]) => ABILITIES[k]).map(([k, v]) => `${ABILITIES[k]} ${(v as number) > 0 ? '+' : ''}${v}`);
    if (fixed.length) out.push(['Ability scores', fixed.join(', ')]);
  }
  return out;
}

export function itemFacts(i: Obj): [string, string][] {
  const out: [string, string][] = [];
  if (i.rarity && i.rarity !== 'none') out.push(['Rarity', i.rarity]);
  if (i.reqAttune) out.push(['Attunement', typeof i.reqAttune === 'string' ? `Required (${i.reqAttune})` : 'Required']);
  if (i.dmg1) out.push(['Damage', `${i.dmg1}${i.dmgType ? ` ${DAMAGE[i.dmgType] ?? i.dmgType}` : ''}`]);
  if (i.ac) out.push(['AC', String(i.ac)]);
  if (i.weight) out.push(['Weight', `${i.weight} lb.`]);
  if (i.value) out.push(['Value', i.value >= 100 ? `${i.value / 100} gp` : `${i.value / 10} sp`]);
  return out;
}
const DAMAGE: Record<string, string> = { B: 'bludgeoning', P: 'piercing', S: 'slashing', N: 'necrotic', R: 'radiant', F: 'fire', C: 'cold', L: 'lightning', A: 'acid', O: 'force', Y: 'psychic', I: 'poison', T: 'thunder' };

export function featPrereq(f: Obj): string {
  const parts: string[] = [];
  for (const p of f.prerequisite ?? []) {
    if (p.level) parts.push(`Level ${typeof p.level === 'number' ? p.level : p.level.level}`);
    for (const a of p.ability ?? []) for (const [k, v] of Object.entries(a)) parts.push(`${ABILITIES[k] ?? k} ${v}`);
    if (p.spellcasting || p.spellcasting2020) parts.push('Spellcasting');
    if (p.other) parts.push(p.other);
  }
  return parts.join('; ');
}

/** Ids of the class features a class grants, with the level each arrives at. */
export function classFeatureRefs(c: Obj): { id: string; level: number }[] {
  return (c.classFeatures ?? []).map((f: string | Obj) => {
    const parts = (typeof f === 'string' ? f : f.classFeature).split('|');
    parts[2] = parts[2] || c.source;
    parts[4] = parts[4] || parts[2];
    const t = linkTarget('classFeature', parts.join('|'))!;
    return { id: t.id, level: Number(parts[3]) };
  });
}

export function subclassFeatureRefs(sc: Obj): { id: string; level: number }[] {
  return (sc.subclassFeatures ?? []).map((f: string) => {
    const parts = f.split('|');
    parts[2] = parts[2] || sc.classSource;
    parts[4] = parts[4] || sc.source;
    parts[6] = parts[6] || parts[4];
    const t = linkTarget('subclassFeature', parts.join('|'))!;
    return { id: t.id, level: Number(parts[5]) };
  });
}

/** Resolves a `refClassFeature` style string ("Name|Class|ClassSource|Level|Source") to an id. */
export function refId(kind: 'classFeature' | 'subclassFeature', ref: string): string {
  return linkTarget(kind, ref)?.id ?? entityId(kind, { name: ref });
}
