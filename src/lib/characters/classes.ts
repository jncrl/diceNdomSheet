import type { Edition } from '../edition';
import type { EntityMeta } from '../search';
import type { Choice, ClassLevel } from './model';
import { byName, pickableOptions } from './options';

// Class and subclass rules over the book-data catalog. Pure functions: no database, no Svelte.
//
// A subclass id is `subclass|<name>|<source>|<short name>|<class>|<class source>`, so its parent
// class id (`class|<class>|<class source>`) can be read straight from the id. Classes from a 2024
// book also list the 2014 subclasses written for them; those are offered after the 2024 ones.

export const classOptions = (list: EntityMeta[], ruleset: Edition): EntityMeta[] => pickableOptions(list, 'class', ruleset);

/** Id of the class a subclass belongs to, or null if the id is not a subclass id. */
export function baseClassId(subclassId: string): string | null {
  const [type, , , , cls, source] = subclassId.split('|');
  return type === 'subclass' && cls && source ? `class|${cls}|${source}` : null;
}

export const isSubclassOf = (subclassId: string, classId: string) => baseClassId(subclassId) === classId;

/** Subclasses of a class: ones from the character's ruleset first, then alphabetical. */
export const subclassOptions = (list: EntityMeta[], classId: string, ruleset: Edition): EntityMeta[] =>
  list
    .filter((m) => m.type === 'subclass' && isSubclassOf(m.id, classId))
    .sort((a, b) => Number(b.edition === ruleset) - Number(a.edition === ruleset) || byName(a, b));

const sameChoice = (a: Choice, b: Choice) => (a.ref || b.ref ? a.ref === b.ref : a.name === b.name);

/**
 * Sets, replaces or clears the class in one row of the class list.
 * `index` null means a new row (level 1). Replacing with a different class drops the subclass;
 * clearing removes the row. Returns the new list and the row the choice now lives in.
 */
export function applyClassChoice(classes: ClassLevel[], index: number | null, choice?: Choice): { classes: ClassLevel[]; index: number | null } {
  if (index === null) {
    if (!choice) return { classes, index };
    return { classes: [...classes, { class: choice, level: 1 }], index: classes.length };
  }
  if (!classes[index]) return { classes, index: null };
  if (!choice) return { classes: classes.filter((_, i) => i !== index), index: null };
  const next = classes.map((k, i) => {
    if (i !== index) return k;
    const { subclass, ...rest } = k;
    return { ...rest, class: choice, ...(subclass && sameChoice(k.class, choice) ? { subclass } : {}) };
  });
  return { classes: next, index };
}

/** Sets or clears the subclass of one class row. */
export function applySubclassChoice(classes: ClassLevel[], index: number, subclass?: Choice): ClassLevel[] {
  return classes.map((k, i) => {
    if (i !== index) return k;
    const { subclass: _old, ...rest } = k;
    return { ...rest, ...(subclass ? { subclass } : {}) };
  });
}
