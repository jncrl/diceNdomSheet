import type { Character, NewCharacterInput } from './model';
import * as service from './service';

// Reactive view of the saved characters for the UI. Operations go through the
// service; this module only keeps the list in sync and holds the last error.

export const roster = $state({
  items: [] as Character[],
  ready: false,
  error: null as string | null
});

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function loadRoster() {
  try {
    roster.items = await service.listAll();
    roster.error = null;
  } catch (e) {
    roster.error = `Could not load characters: ${message(e)}`;
  } finally {
    roster.ready = true;
  }
}

export async function addCharacter(input: NewCharacterInput): Promise<Character | null> {
  try {
    const created = await service.createCharacter(input);
    await loadRoster();
    return created;
  } catch (e) {
    roster.error = `Could not create character: ${message(e)}`;
    return null;
  }
}

export async function loadCharacter(id: string): Promise<Character | undefined> {
  try {
    return await service.getById(id);
  } catch (e) {
    roster.error = `Could not load character: ${message(e)}`;
    return undefined;
  }
}

export async function setSpecies(id: string, species?: string, subspecies?: string): Promise<Character | null> {
  try {
    const updated = await service.chooseSpecies(id, species, subspecies);
    await loadRoster();
    return updated;
  } catch (e) {
    roster.error = `Could not save species: ${message(e)}`;
    return null;
  }
}

export async function deleteCharacter(id: string) {
  try {
    await service.removeCharacter(id);
    await loadRoster();
  } catch (e) {
    roster.error = `Could not delete character: ${message(e)}`;
  }
}
