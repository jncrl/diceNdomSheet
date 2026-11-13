import type { Edition } from '../edition';
import type { EntityMeta } from '../search';

// Which book entries a picker offers. Pure functions: no database, no Svelte.

const CORE_SOURCES = new Set(['PHB', 'XPHB']);
const core = (m: EntityMeta) => (CORE_SOURCES.has(m.source) ? 1 : 0);

export const byName = (a: EntityMeta, b: EntityMeta) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source);

/** Entries of one type for a ruleset, core books first, then alphabetical. */
export const pickableOptions = (list: EntityMeta[], type: string, ruleset: Edition): EntityMeta[] =>
  list.filter((m) => m.type === type && m.edition === ruleset).sort((a, b) => core(b) - core(a) || byName(a, b));
