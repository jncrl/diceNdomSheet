import { newCharacter, normalizeCharacter, validateCharacter, type Character, type Choice, type ClassLevel, type NewCharacterInput } from './model';
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

/** Replaces whole sections of a character, tidies it (see normalizeCharacter) and bumps `updatedAt`. */
export async function updateCharacter(id: string, patch: CharacterPatch, now = new Date()): Promise<Character> {
  const current = await repo.getCharacter(id);
  if (!current) throw new CharacterError(`Character ${id} not found`);
  const next = normalizeCharacter({ ...current, ...patch, id: current.id, createdAt: current.createdAt, updatedAt: now.toISOString() });
  assertValid(next);
  return repo.saveCharacter(next);
}

/** Sets the species (and optional 2014 subrace). Changing species clears any earlier subrace. */
export async function chooseSpecies(id: string, species?: Choice, subspecies?: Choice): Promise<Character> {
  const current = await repo.getCharacter(id);
  if (!current) throw new CharacterError(`Character ${id} not found`);
  const { species: _species, subspecies: _subspecies, ...rest } = current.choices;
  const choices = { ...rest, ...(species ? { species } : {}), ...(species && subspecies ? { subspecies } : {}) };
  return updateCharacter(id, { choices });
}

/** Sets or clears the background. */
export async function chooseBackground(id: string, background?: Choice): Promise<Character> {
  const current = await repo.getCharacter(id);
  if (!current) throw new CharacterError(`Character ${id} not found`);
  const { background: _background, ...rest } = current.choices;
  return updateCharacter(id, { choices: { ...rest, ...(background ? { background } : {}) } });
}

/** Replaces the class list (use applyClassChoice / applySubclassChoice to build it). */
export async function setClasses(id: string, classes: ClassLevel[]): Promise<Character> {
  const current = await repo.getCharacter(id);
  if (!current) throw new CharacterError(`Character ${id} not found`);
  return updateCharacter(id, { choices: { ...current.choices, classes } });
}

export const removeCharacter = (id: string) => repo.deleteCharacter(id);
export const listAll = repo.listCharacters;
export const getById = repo.getCharacter;
