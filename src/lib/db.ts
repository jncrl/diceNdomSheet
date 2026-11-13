import Dexie, { type Table } from 'dexie';
import type { Character } from './characters/model';
import type { Entity } from './pipeline';

export interface MetaRow {
  key: string;
  value: any;
}

class AppDB extends Dexie {
  meta!: Table<MetaRow, string>;
  entities!: Table<Entity, string>;
  characters!: Table<Character, string>;
  constructor() {
    super('tome-sheet');
    this.version(1).stores({
      meta: 'key',
      entities: 'id, type, source, edition, name, level'
    });
    // v2 (M3) adds characters. Book data in `entities` is rebuilt on sync;
    // characters are user data and must never be cleared by it.
    this.version(2).stores({
      meta: 'key',
      entities: 'id, type, source, edition, name, level',
      characters: 'id, updatedAt'
    });
  }
}

export const db = new AppDB();

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export const setMeta = (key: string, value: any) => db.meta.put({ key, value });
