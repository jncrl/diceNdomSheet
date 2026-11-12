// Parser for 5etools inline markup such as {@spell fireball|phb} and {@b bold text}.
import { entityId, type Obj } from './resolve';

export type Node = { t: 'text'; v: string } | { t: 'tag'; name: string; raw: string };

export function parseInline(s: string): Node[] {
  const out: Node[] = [];
  let i = 0;
  let textStart = 0;
  while (i < s.length) {
    if (s[i] === '{' && s[i + 1] === '@') {
      let depth = 1;
      let j = i + 1;
      while (j < s.length && depth > 0) {
        j++;
        if (s[j] === '{') depth++;
        else if (s[j] === '}') depth--;
      }
      if (depth !== 0) break; // unbalanced: treat the rest as text
      if (i > textStart) out.push({ t: 'text', v: s.slice(textStart, i) });
      const inner = s.slice(i + 2, j);
      const sp = inner.indexOf(' ');
      out.push(sp === -1 ? { t: 'tag', name: inner, raw: '' } : { t: 'tag', name: inner.slice(0, sp), raw: inner.slice(sp + 1) });
      i = textStart = j + 1;
    } else i++;
  }
  if (textStart < s.length) out.push({ t: 'text', v: s.slice(textStart) });
  return out;
}

/** Tags that wrap other text, mapped to the HTML element that renders them. */
export const FORMAT_TAGS: Record<string, string> = {
  b: 'strong', bold: 'strong', i: 'em', italic: 'em', u: 'u', underline: 'u',
  s: 's', strike: 's', sup: 'sup', sub: 'sub', note: 'em', kbd: 'kbd'
};

/** Tags that point at another entity, mapped to the stored entity type. */
const LINK_TYPES: Record<string, string> = {
  spell: 'spell', item: 'item', race: 'race', background: 'background', feat: 'feat', class: 'class',
  condition: 'condition', disease: 'disease', status: 'status', action: 'action', variantrule: 'variantrule',
  optfeature: 'optionalfeature', skill: 'skill', sense: 'sense', classFeature: 'classFeature', subclassFeature: 'subclassFeature'
};

// 5etools assumes these sources when a tag names none.
const DEFAULT_SOURCE: Record<string, string> = {
  spell: 'PHB', item: 'DMG', race: 'PHB', background: 'PHB', feat: 'PHB', class: 'PHB', condition: 'PHB',
  disease: 'DMG', status: 'PHB', action: 'PHB', variantrule: 'DMG', optionalfeature: 'PHB', skill: 'PHB', sense: 'PHB'
};

export interface LinkTarget {
  type: string;
  name: string;
  display: string;
  id: string; // exact id, using the default source if none was written
  explicitSource: boolean;
}

export function linkTarget(tag: string, raw: string): LinkTarget | null {
  const type = LINK_TYPES[tag];
  if (!type) return null;
  const a = raw.split('|');
  const name = a[0];
  if (type === 'classFeature') {
    const classSource = a[2] || 'PHB';
    const o = { name, source: a[4] || classSource, className: a[1], classSource, level: a[3] };
    return { type, name, display: a[5] || name, id: entityId(type, o), explicitSource: true };
  }
  if (type === 'subclassFeature') {
    const subclassSource = a[4] || 'PHB';
    const o = { name, source: a[6] || subclassSource, className: a[1], classSource: a[2] || 'PHB', subclassShortName: a[3], subclassSource, level: a[5] };
    return { type, name, display: a[7] || name, id: entityId(type, o), explicitSource: true };
  }
  const explicitSource = !!a[1];
  const source = a[1] || DEFAULT_SOURCE[type] || 'PHB';
  return { type, name, display: a[2] || name, id: entityId(type, { name, source }), explicitSource };
}

const ATK: Record<string, string> = {
  mw: 'Melee Weapon Attack:', rw: 'Ranged Weapon Attack:', ms: 'Melee Spell Attack:', rs: 'Ranged Spell Attack:',
  m: 'Melee Attack Roll:', r: 'Ranged Attack Roll:', 'mw,rw': 'Melee or Ranged Weapon Attack:', 'ms,rs': 'Melee or Ranged Spell Attack:'
};

const signed = (n: string) => (/^\d/.test(n) ? `+${n}` : n);

/** Plain text for a tag that is neither a wrapper nor a link. */
export function tagText(name: string, raw: string): string {
  const a = raw.split('|');
  switch (name) {
    case 'hit': return signed(a[0]);
    case 'd20': return signed(a[0]);
    case 'dc': return `DC ${a[0]}`;
    case 'h': return 'Hit: ';
    case 'atk': return ATK[a[0]] ?? 'Attack:';
    case 'atkr': return ATK[a[0]] ?? 'Attack:';
    case 'recharge': return a[0] ? `(Recharge ${a[0]}\u20136)` : '(Recharge 6)';
    case 'chance': return a[1] || `${a[0]} percent`;
    case 'coinflip': return 'flip a coin';
    case 'dice': return a[1] || a[0];
    case 'scaledamage':
    case 'scaledice': return a[3] || a[2] || a[0];
    case 'classFeature': return a[5] || a[0];
    case 'subclassFeature': return a[7] || a[0];
    default: return a[2] && LINK_TYPES[name] ? a[2] : a[0];
  }
}

/** Removes all markup, for search text and fallbacks. */
export function stripTags(s: string): string {
  return parseInline(s)
    .map((n) => {
      if (n.t === 'text') return n.v;
      if (FORMAT_TAGS[n.name]) return stripTags(n.raw);
      return tagText(n.name, n.raw);
    })
    .join('');
}

/** Flattens an entry tree into searchable plain text. */
export function flattenEntries(node: any, out: string[] = [], budget = { n: 2500 }): string[] {
  if (budget.n <= 0 || node == null) return out;
  if (typeof node === 'string') {
    const t = stripTags(node);
    budget.n -= t.length;
    out.push(t);
  } else if (Array.isArray(node)) {
    for (const x of node) flattenEntries(x, out, budget);
  } else if (typeof node === 'object') {
    for (const k of ['entries', 'entry', 'items', 'rows']) if (node[k]) flattenEntries(node[k], out, budget);
  }
  return out;
}

export type { Obj };
