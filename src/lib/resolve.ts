// Resolves 5etools `_copy` / `_mod` inheritance so every stored entity is self-contained.
export type Obj = Record<string, any>;

export interface ResolveReport {
  copies: number;
  unresolved: number;
  unsupported: Record<string, number>;
}

// Props that describe the *source* entry rather than the content, so a copy must not inherit them.
const DROP_FROM_BASE = [
  'otherSources', 'srd', 'srd52', 'basicRules', 'basicRules2024',
  'reprintedAs', 'hasFluff', 'hasFluffImages', '_versions'
];

// Some types share name+source across different parents (e.g. a feature per class), so identity
// needs extra fields. `_copy` references use the same field names, so one function serves both.
const IDENTITY_EXTRA: Record<string, string[]> = {
  subrace: ['raceName', 'raceSource'],
  subclass: ['shortName', 'className', 'classSource'],
  classFeature: ['className', 'classSource', 'level'],
  subclassFeature: ['className', 'classSource', 'subclassShortName', 'subclassSource', 'level']
};

export function identityKey(type: string, o: Obj): string {
  const extra = (IDENTITY_EXTRA[type] ?? []).map((f) => o[f] ?? '');
  return [o.name ?? '', o.source ?? '', ...extra].join('|').toLowerCase();
}
const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function replaceInStrings(node: any, re: RegExp, withStr: string): any {
  if (typeof node === 'string') return node.replace(re, withStr);
  if (Array.isArray(node)) return node.map((n) => replaceInStrings(n, re, withStr));
  if (node && typeof node === 'object') {
    const out: Obj = {};
    for (const [k, v] of Object.entries(node)) out[k] = replaceInStrings(v, re, withStr);
    return out;
  }
  return node;
}

const nameOf = (item: any) => (item && typeof item === 'object' ? item.name : item);

function setPath(target: Obj, path: string, value: any) {
  const parts = path.split('.');
  let cur = target;
  for (const p of parts.slice(0, -1)) cur = cur[p] ??= {};
  cur[parts[parts.length - 1]] = value;
}

function applyMod(target: Obj, prop: string, mod: Obj, report: ResolveReport) {
  const mode: string = mod.mode;
  switch (mode) {
    case 'replaceTxt': {
      const re = new RegExp(mod.replace, mod.flags ?? 'g');
      const props: (string | null)[] = mod.props ?? [null];
      if (prop === '*') {
        for (const k of Object.keys(target)) {
          if (k === 'name' || k === 'source') continue;
          if (props.includes(null) || props.includes(k)) target[k] = replaceInStrings(target[k], re, mod.with);
        }
      } else if (target[prop] !== undefined) {
        target[prop] = replaceInStrings(target[prop], re, mod.with);
      }
      return;
    }
    case 'setProp': {
      if (typeof mod.prop === 'string') setPath(prop === '*' ? target : (target[prop] ??= {}), mod.prop, mod.value);
      else if (prop !== '*') target[prop] = mod.value;
      else report.unsupported['setProp@*'] = (report.unsupported['setProp@*'] ?? 0) + 1;
      return;
    }
  }

  // Remaining modes act on an array property.
  if (prop === '*') {
    report.unsupported[`${mode}@*`] = (report.unsupported[`${mode}@*`] ?? 0) + 1;
    return;
  }
  const items = asArray(mod.items);
  const arr: any[] = Array.isArray(target[prop]) ? target[prop] : [];
  switch (mode) {
    case 'appendArr':
      target[prop] = [...arr, ...items];
      return;
    case 'appendIfNotExistsArr':
      target[prop] = [...arr, ...items.filter((i) => !arr.some((a) => JSON.stringify(a) === JSON.stringify(i)))];
      return;
    case 'prependArr':
      target[prop] = [...items, ...arr];
      return;
    case 'insertArr': {
      const next = [...arr];
      next.splice(mod.index ?? next.length, 0, ...items);
      target[prop] = next;
      return;
    }
    case 'removeArr': {
      const names = asArray<string>(mod.names ?? mod.items);
      target[prop] = arr.filter((a) => !names.includes(nameOf(a)));
      return;
    }
    case 'replaceArr':
    case 'replaceOrAppendArr': {
      const idx =
        typeof mod.replace === 'object' && mod.replace !== null
          ? mod.replace.index
          : arr.findIndex((a) => nameOf(a) === mod.replace);
      const next = [...arr];
      if (idx >= 0 && idx < next.length) next.splice(idx, 1, ...items);
      else if (mode === 'replaceOrAppendArr') next.push(...items);
      target[prop] = next;
      return;
    }
    default:
      report.unsupported[mode] = (report.unsupported[mode] ?? 0) + 1;
  }
}

function applyMods(target: Obj, mods: Obj, report: ResolveReport) {
  for (const [prop, spec] of Object.entries(mods)) {
    for (const mod of asArray<Obj | string>(spec)) {
      if (mod === 'remove' && prop !== '*') {
        delete target[prop];
        continue;
      }
      if (typeof mod === 'string') {
        report.unsupported[mod] = (report.unsupported[mod] ?? 0) + 1;
        continue;
      }
      applyMod(target, prop, mod, report);
    }
  }
}

/** Resolves all `_copy` entries within one entity group (e.g. every `race`). */
export function resolveGroup(type: string, entries: Obj[], report: ResolveReport): Obj[] {
  const byKey = new Map<string, Obj>();
  for (const e of entries) if (e.source) byKey.set(identityKey(type, e), e);

  const done = new Map<Obj, Obj>();
  const visiting = new Set<Obj>();

  const resolve = (e: Obj): Obj => {
    if (!e._copy) return e;
    const cached = done.get(e);
    if (cached) return cached;

    const { _copy, ...own } = e;
    report.copies++;
    let out: Obj;
    const baseRaw = visiting.has(e) ? undefined : byKey.get(identityKey(type, _copy));
    if (!baseRaw) {
      report.unresolved++;
      out = { ...own, _unresolved: true };
    } else {
      visiting.add(e);
      const base = resolve(baseRaw);
      visiting.delete(e);
      const clone: Obj = structuredClone(base);
      const preserve: Obj = _copy._preserve ?? {};
      if (!preserve['*']) for (const k of DROP_FROM_BASE) if (!preserve[k]) delete clone[k];
      out = { ...clone, ...own };
      if (_copy._mod) applyMods(out, _copy._mod, report);
    }
    done.set(e, out);
    return out;
  };

  return entries.map(resolve);
}
