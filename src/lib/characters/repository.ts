import { db } from '../db';
import type { Character } from './model';

// Persistence only. No validation or rules here; see service.ts.

/** Most recently updated first. */
export const listCharacters = () => db.characters.orderBy('updatedAt').reverse().toArray();

export const getCharacter = (id: string) => db.characters.get(id);

export const saveCharacter = async (character: Character) => {
  await db.characters.put(character);
  return character;
};

export const deleteCharacter = (id: string) => db.characters.delete(id);

export const countCharacters = () => db.characters.count();
