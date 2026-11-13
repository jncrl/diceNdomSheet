import { newCharacter, validateCharacter, type Character, type NewCharacterInput } from './model';
import * as repo from './repository';

// Application operations on characters. UI components call these, never the repository.

export class CharacterError extends Error {}

export type CharacterPatch = Partial<Pick<Character, 'details' | 'choices' | 'equipment' | 'progression'>>;

function assertValid(character: Character) {
  const errors = validateCharacter(character);
  if (errors.length) throw new CharacterError(errors.join('; '));
}

export async function createCharacter(input: NewCharacterInput): Promise<Character> {
  const character = newCharacter(input);
  assertValid(character);
  return repo.saveCharacter(character);
}

/** Replaces whole sections of a character and bumps `updatedAt`. */
export async function updateCharacter(id: string, patch: CharacterPatch, now = new Date()): Promise<Character> {
  const current = await repo.getCharacter(id);
  if (!current) throw new CharacterError(`Character ${id} not found`);
  const next: Character = { ...current, ...patch, id: current.id, createdAt: current.createdAt, updatedAt: now.toISOString() };
  assertValid(next);
  return repo.saveCharacter(next);
}

export const removeCharacter = (id: string) => repo.deleteCharacter(id);
export const listAll = repo.listCharacters;
export const getById = repo.getCharacter;
