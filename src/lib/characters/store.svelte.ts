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

export async function addCharacter(input: NewCharacterInput): Promise<boolean> {
  try {
    await service.createCharacter(input);
    await loadRoster();
    return true;
  } catch (e) {
    roster.error = `Could not create character: ${message(e)}`;
    return false;
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
