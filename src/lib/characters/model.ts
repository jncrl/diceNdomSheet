import type { Edition } from '../edition';
import { isSubclassOf } from './classes';
import { isSubspeciesOf } from './species';

// Character domain model. Pure data and rules: no Svelte, no database, no styling.
// Persistence lives in repository.ts, orchestration in service.ts.

/**
 * Version of the character record shape. Backups carry their own, separate format
 * version (added with backup/restore) so the two can evolve independently of the
 * IndexedDB schema version in db.ts.
 *
 * 1: selections stored as bare book ids.
 * 2: selections stored as `Choice` ({ name, ref? }) so homebrew and manual entries work.
 */
export const CHARACTER_SCHEMA_VERSION = 2;

/** Id of an entity in the book-data store, e.g. `spell|fireball|xphb`. */
export type EntityRef = string;

/**
 * A selection on the sheet. `name` is always present and is what the sheet shows, so it works
 * offline and for homebrew. `ref` links to book data when the player picked from the books.
 */
export interface Choice {
  name: string;
  ref?: EntityRef;
}

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];
export type AbilityScores = Record<Ability, number>;

/** One entry per class so multiclassing needs no schema change later. */
export interface ClassLevel {
  class: Choice;
  subclass?: Choice;
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
  choices: {
    species?: Choice;
    subspecies?: Choice; // 2014 subrace; a `ref` here must belong to the species `ref`
    background?: Choice;
    classes: ClassLevel[];
    abilityScores: AbilityScores;
    skills: string[]; // proficient skills, 5etools keys such as `athletics`
    feats: Choice[];
    spells: Choice[];
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

export function characterSummary(c: Character): string {
  const classes = c.choices.classes.map((k) => `${k.class.name} ${k.level}`).join(' / ');
  return [c.choices.species?.name, classes || 'No class yet', `${c.details.ruleset} rules`].filter(Boolean).join(' · ');
}

// ---- Choices -------------------------------------------------------------------------------

/** A readable name for a book id, used when upgrading records that only stored the id. */
export const nameFromRef = (ref: EntityRef) => (ref.split('|')[1] ?? ref).replace(/\b\w/g, (ch) => ch.toUpperCase());

/**
 * Applies text typed by the player to a selection. Editing the name of a book pick turns it into a
 * custom entry, because the book link would no longer describe what is on the sheet.
 */
export function withName(choice: Choice | undefined, name: string): Choice | undefined {
  if (name.trim() === '') return undefined;
  return choice && choice.name === name ? choice : { name };
}

// ---- Normalising and migrating -------------------------------------------------------------

const cleanChoice = (c: Choice | undefined): Choice | undefined => {
  const name = c?.name.trim();
  return name ? (c?.ref ? { name, ref: c.ref } : { name }) : undefined;
};
const cleanChoices = (list: Choice[]) => list.map(cleanChoice).filter((c): c is Choice => !!c);

/**
 * Tidies a character before it is saved: trims text, drops blank rows (a half-typed row on the
 * sheet is not an error) and removes a subrace book link that no longer matches the species.
 */
export function normalizeCharacter(c: Character): Character {
  const species = cleanChoice(c.choices.species);
  let subspecies = cleanChoice(c.choices.subspecies);
  if (subspecies?.ref && !(species?.ref && isSubspeciesOf(subspecies.ref, species.ref))) subspecies = { name: subspecies.name };

  const choices: Character['choices'] = {
    ...c.choices,
    species,
    subspecies,
    background: cleanChoice(c.choices.background),
    classes: c.choices.classes.flatMap((k) => {
      const cls = cleanChoice(k.class);
      if (!cls) return [];
      let subclass = cleanChoice(k.subclass);
      if (subclass?.ref && !(cls.ref && isSubclassOf(subclass.ref, cls.ref))) subclass = { name: subclass.name };
      return [{ ...k, class: cls, subclass }];
    }),
    feats: cleanChoices(c.choices.feats),
    spells: cleanChoices(c.choices.spells)
  };
  for (const key of ['species', 'subspecies', 'background'] as const) if (!choices[key]) delete choices[key];
  for (const k of choices.classes) if (!k.subclass) delete k.subclass;

  const equipment = c.equipment.flatMap((e) => {
    const name = e.name.trim();
    if (!name) return [];
    const notes = e.notes?.trim();
    const { notes: _drop, ...rest } = e;
    return [{ ...rest, name, ...(notes ? { notes } : {}) }];
  });

  return { ...c, details: { ...c.details, name: c.details.name.trim() }, choices, equipment };
}

/**
 * Upgrades an older record to the current shape. Apply it to anything read from storage or from
 * a backup; records already current, or not recognisably a character, are returned unchanged.
 */
export function migrateCharacter(raw: unknown): unknown {
  if (!isObject(raw) || raw.schemaVersion !== 1 || !isObject(raw.choices)) return raw;
  const toChoice = (v: unknown) => (typeof v === 'string' ? ({ name: nameFromRef(v), ref: v } satisfies Choice) : v);
  const list = (v: unknown) => (Array.isArray(v) ? v.map(toChoice) : v);
  const old = raw.choices;
  return {
    ...raw,
    schemaVersion: 2,
    choices: {
      ...old,
      species: toChoice(old.species),
      subspecies: toChoice(old.subspecies),
      background: toChoice(old.background),
      classes: Array.isArray(old.classes)
        ? old.classes.map((k) => (isObject(k) ? { ...k, class: toChoice(k.class), subclass: toChoice(k.subclass) } : k))
        : old.classes,
      feats: list(old.feats),
      spells: list(old.spells)
    }
  };
}

// ---- Validation ----------------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max = Infinity): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isIso = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const isChoice = (v: unknown): boolean => isObject(v) && typeof v.name === 'string' && v.name.trim() !== '' && (v.ref === undefined || typeof v.ref === 'string');

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
    for (const key of ['species', 'subspecies', 'background'] as const) {
      if (c[key] !== undefined && !isChoice(c[key])) bad(`choices.${key} needs a name and an optional book id`);
    }
    const sub = c.subspecies;
    const sp = c.species;
    if (isObject(sub) && typeof sub.ref === 'string' && !(isObject(sp) && typeof sp.ref === 'string' && isSubspeciesOf(sub.ref, sp.ref))) {
      bad('choices.subspecies must belong to the chosen species');
    }
    if (!Array.isArray(c.classes)) bad('choices.classes must be an array');
    else
      c.classes.forEach((k, i) => {
        if (!isObject(k) || !isChoice(k.class) || !isInt(k.level, 1, 20)) bad(`choices.classes[${i}] needs a class name and a level from 1 to 20`);
        else if (k.subclass !== undefined && !isChoice(k.subclass)) bad(`choices.classes[${i}].subclass needs a name`);
        else if (isObject(k.subclass) && typeof k.subclass.ref === 'string' && !(isObject(k.class) && typeof k.class.ref === 'string' && isSubclassOf(k.subclass.ref, k.class.ref))) {
          bad(`choices.classes[${i}].subclass must belong to the chosen class`);
        }
      });
    const scores = c.abilityScores;
    if (!isObject(scores)) bad('choices.abilityScores must be an object');
    else for (const a of ABILITIES) if (!isInt(scores[a], 1, 30)) bad(`choices.abilityScores.${a} must be an integer from 1 to 30`);
    if (!isStringArray(c.skills)) bad('choices.skills must be an array of strings');
    for (const key of ['feats', 'spells'] as const) {
      if (!Array.isArray(c[key]) || !(c[key] as unknown[]).every(isChoice)) bad(`choices.${key} must be a list of named entries`);
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
