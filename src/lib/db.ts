import Dexie, { type Table } from 'dexie';
import type { Entity } from './pipeline';

export interface MetaRow {
  key: string;
  value: any;
}

class AppDB extends Dexie {
  meta!: Table<MetaRow, string>;
  entities!: Table<Entity, string>;
  constructor() {
    super('tome-sheet');
    this.version(1).stores({
      meta: 'key',
      entities: 'id, type, source, edition, name, level'
    });
  }
}

export const db = new AppDB();

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export const setMeta = (key: string, value: any) => db.meta.put({ key, value });
