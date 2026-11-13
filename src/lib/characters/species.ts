import type { Edition } from '../edition';
import type { EntityMeta } from '../search';

// Species rules over the book-data catalog. Pure functions: no database, no Svelte.
//
// 2014 books list a species (`race`) plus optional variants (`subrace`) as separate entries.
// A subrace id ends with its parent species: `subrace|drow|phb|elf|phb` belongs to `race|elf|phb`.
// 2024 species have no subrace entries; their lineages live inside the species text.

const CORE_SOURCES = new Set(['PHB', 'XPHB']);
const core = (m: EntityMeta) => (CORE_SOURCES.has(m.source) ? 1 : 0);
const byName = (a: EntityMeta, b: EntityMeta) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source);

/** Species for a ruleset, core books first, then alphabetical. */
export const speciesOptions = (list: EntityMeta[], ruleset: Edition): EntityMeta[] =>
  list.filter((m) => m.type === 'race' && m.edition === ruleset).sort((a, b) => core(b) - core(a) || byName(a, b));

/** Id of the species a subrace belongs to, or null if the id is not a subrace id. */
export function baseSpeciesId(subspeciesId: string): string | null {
  const [type, , , race, raceSource] = subspeciesId.split('|');
  return type === 'subrace' && race && raceSource ? `race|${race}|${raceSource}` : null;
}

export const isSubspeciesOf = (subspeciesId: string, speciesId: string) => baseSpeciesId(subspeciesId) === speciesId;

export const subspeciesOptions = (list: EntityMeta[], speciesId: string): EntityMeta[] =>
  list.filter((m) => m.type === 'subrace' && isSubspeciesOf(m.id, speciesId)).sort(byName);
