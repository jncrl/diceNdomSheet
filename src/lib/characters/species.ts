import type { Edition } from '../edition';
import type { EntityMeta } from '../search';
import { byName, pickableOptions } from './options';

// Species rules over the book-data catalog. Pure functions: no database, no Svelte.
//
// 2014 books list a species (`race`) plus optional variants (`subrace`) as separate entries.
// A subrace id ends with its parent species: `subrace|drow|phb|elf|phb` belongs to `race|elf|phb`.
// 2024 species have no subrace entries; their lineages live inside the species text.

/** Species for a ruleset, core books first, then alphabetical. */
export const speciesOptions = (list: EntityMeta[], ruleset: Edition): EntityMeta[] => pickableOptions(list, 'race', ruleset);

/** Id of the species a subrace belongs to, or null if the id is not a subrace id. */
export function baseSpeciesId(subspeciesId: string): string | null {
  const [type, , , race, raceSource] = subspeciesId.split('|');
  return type === 'subrace' && race && raceSource ? `race|${race}|${raceSource}` : null;
}

export const isSubspeciesOf = (subspeciesId: string, speciesId: string) => baseSpeciesId(subspeciesId) === speciesId;

export const subspeciesOptions = (list: EntityMeta[], speciesId: string): EntityMeta[] =>
  list.filter((m) => m.type === 'subrace' && isSubspeciesOf(m.id, speciesId)).sort(byName);
