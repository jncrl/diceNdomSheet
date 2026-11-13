import { db } from '../db';
import { migrateCharacter, type Character } from './model';

// Persistence only. No validation or rules here; see service.ts.
// Reads upgrade older records to the current shape (they are rewritten on the next save).

const upgrade = (raw: Character | undefined) => migrateCharacter(raw) as Character | undefined;

/** Most recently updated first. */
export const listCharacters = async () => (await db.characters.orderBy('updatedAt').reverse().toArray()).map((c) => upgrade(c) as Character);

export const getCharacter = async (id: string) => upgrade(await db.characters.get(id));

export const saveCharacter = async (character: Character) => {
  await db.characters.put(character);
  return character;
};

export const deleteCharacter = (id: string) => db.characters.delete(id);

export const countCharacters = () => db.characters.count();
