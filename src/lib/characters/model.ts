import type { Edition } from '../edition';

// Character domain model. Pure data and rules: no Svelte, no database, no styling.
// Persistence lives in repository.ts, orchestration in service.ts.

/**
 * Version of the character record shape. Backups carry their own, separate format
 * version (added with backup/restore) so the two can evolve independently of the
 * IndexedDB schema version in db.ts.
 */
export const CHARACTER_SCHEMA_VERSION = 1;

/** Id of an entity in the book-data store, e.g. `spell|fireball|xphb`. */
export type EntityRef = string;

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];
export type AbilityScores = Record<Ability, number>;

/** One entry per class so multiclassing needs no schema change later. */
export interface ClassLevel {
  class: EntityRef;
  subclass?: EntityRef;
  level: number;
}

export interface EquipmentItem {
  item?: EntityRef; // omitted for custom items
  name: string;
  quantity: number;
  notes?: string;
}

export interface LevelRecord {
  level: number; // total character level reached
  class?: EntityRef; // class that gained the level
  at: string; // ISO timestamp
}

export interface Character {
  id: string;
  schemaVersion: number;
  createdAt: string; // ISO timestamps
  updatedAt: string;
  details: {
    name: string;
    ruleset: Edition;
    notes?: string;
  };
  /** Selections reference book data by entity id rather than copying it. */
  choices: {
    species?: EntityRef;
    background?: EntityRef;
    classes: ClassLevel[];
    abilityScores: AbilityScores;
    skills: string[]; // 5etools skill keys, e.g. `athletics`
    feats: EntityRef[];
    spells: EntityRef[];
  };
  equipment: EquipmentItem[];
  progression: {
    history: LevelRecord[];
  };
}

export interface NewCharacterInput {
  name: string;
  ruleset: Edition;
  id?: string;
  now?: Date;
}

export function newCharacter({ name, ruleset, id, now = new Date() }: NewCharacterInput): Character {
  const stamp = now.toISOString();
  return {
    id: id ?? crypto.randomUUID(),
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    createdAt: stamp,
    updatedAt: stamp,
    details: { name: name.trim(), ruleset },
    choices: {
      classes: [],
      abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      skills: [],
      feats: [],
      spells: []
    },
    equipment: [],
    progression: { history: [] }
  };
}

export const totalLevel = (c: Character) => c.choices.classes.reduce((sum, k) => sum + k.level, 0);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max = Infinity): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isIso = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/** Returns a list of problems; an empty list means the value is a usable Character. */
export function validateCharacter(value: unknown): string[] {
  if (!isObject(value)) return ['Character must be an object'];
  const errors: string[] = [];
  const bad = (msg: string) => errors.push(msg);

  if (typeof value.id !== 'string' || !value.id) bad('id must be a non-empty string');
  if (!isInt(value.schemaVersion, 1)) bad('schemaVersion must be a positive integer');
  else if ((value.schemaVersion as number) > CHARACTER_SCHEMA_VERSION) bad('Character was saved by a newer version of the app');
  if (!isIso(value.createdAt)) bad('createdAt must be an ISO timestamp');
  if (!isIso(value.updatedAt)) bad('updatedAt must be an ISO timestamp');

  const d = value.details;
  if (!isObject(d)) bad('details must be an object');
  else {
    if (typeof d.name !== 'string' || !d.name.trim()) bad('details.name must be a non-empty string');
    if (d.ruleset !== '2014' && d.ruleset !== '2024') bad('details.ruleset must be "2014" or "2024"');
    if (d.notes !== undefined && typeof d.notes !== 'string') bad('details.notes must be a string');
  }

  const c = value.choices;
  if (!isObject(c)) bad('choices must be an object');
  else {
    for (const key of ['species', 'background'] as const) {
      if (c[key] !== undefined && typeof c[key] !== 'string') bad(`choices.${key} must be an entity id`);
    }
    if (!Array.isArray(c.classes)) bad('choices.classes must be an array');
    else
      c.classes.forEach((k, i) => {
        if (!isObject(k) || typeof k.class !== 'string' || !isInt(k.level, 1, 20)) bad(`choices.classes[${i}] needs a class id and a level from 1 to 20`);
        else if (k.subclass !== undefined && typeof k.subclass !== 'string') bad(`choices.classes[${i}].subclass must be an entity id`);
      });
    const scores = c.abilityScores;
    if (!isObject(scores)) bad('choices.abilityScores must be an object');
    else for (const a of ABILITIES) if (!isInt(scores[a], 1, 30)) bad(`choices.abilityScores.${a} must be an integer from 1 to 30`);
    for (const key of ['skills', 'feats', 'spells'] as const) {
      if (!isStringArray(c[key])) bad(`choices.${key} must be an array of strings`);
    }
  }

  if (!Array.isArray(value.equipment)) bad('equipment must be an array');
  else
    value.equipment.forEach((e, i) => {
      if (!isObject(e) || typeof e.name !== 'string' || !e.name || !isInt(e.quantity, 0)) bad(`equipment[${i}] needs a name and a non-negative whole quantity`);
      else if ((e.item !== undefined && typeof e.item !== 'string') || (e.notes !== undefined && typeof e.notes !== 'string')) bad(`equipment[${i}] has an invalid item or notes`);
    });

  const p = value.progression;
  if (!isObject(p) || !Array.isArray(p.history)) bad('progression.history must be an array');
  else
    p.history.forEach((h, i) => {
      if (!isObject(h) || !isInt(h.level, 1) || !isIso(h.at) || (h.class !== undefined && typeof h.class !== 'string')) bad(`progression.history[${i}] is invalid`);
    });

  return errors;
}
