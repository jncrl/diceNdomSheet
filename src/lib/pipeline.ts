import { makeEditionResolver, type Edition } from './edition';
import { identityKey, resolveGroup, type Obj, type ResolveReport } from './resolve';

export const DEFAULT_MIRROR = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/';

export interface Entity {
  id: string; // type|name|source plus parent fields where needed, lowercased
  type: string; // 5etools array key, e.g. spell, race, classFeature
  name: string;
  source: string;
  edition: Edition;
  level?: number;
  json: Obj;
}

export interface SyncReport extends ResolveReport {
  version: string;
  entities: number;
  duplicates: number;
  skipped: number; // entries with no name or source (e.g. generic magic variants), not stored
  failedFiles: string[];
  counts: Record<string, Record<Edition, number>>;
}

export interface Progress {
  done: number;
  total: number;
  label: string;
}

export class SyncError extends Error {}

interface FileSpec {
  path: string;
  keys: string[];
}

const STATIC_FILES: FileSpec[] = [
  { path: 'races.json', keys: ['race', 'subrace'] },
  { path: 'backgrounds.json', keys: ['background'] },
  { path: 'feats.json', keys: ['feat'] },
  { path: 'items.json', keys: ['item', 'itemGroup'] },
  { path: 'items-base.json', keys: ['baseitem'] },
  { path: 'magicvariants.json', keys: ['magicvariant'] },
  { path: 'optionalfeatures.json', keys: ['optionalfeature'] },
  { path: 'conditionsdiseases.json', keys: ['condition', 'disease', 'status'] },
  { path: 'variantrules.json', keys: ['variantrule'] },
  { path: 'actions.json', keys: ['action'] },
  { path: 'skills.json', keys: ['skill'] },
  { path: 'senses.json', keys: ['sense'] }
];

export function normalizeBase(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) throw new SyncError('The mirror URL must start with https://');
  if (!u.endsWith('/')) u += '/';
  return u;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(base: string, path: string, opts: { fresh?: boolean; retries?: number } = {}): Promise<any> {
  const retries = opts.retries ?? 3;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(base + path, { cache: opts.fresh ? 'no-store' : 'default' });
      if (res.status === 404) throw new SyncError(`Not found: ${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (e instanceof SyncError) throw e; // a 404 will not fix itself on retry
      if (attempt < retries) await sleep(400 * 2 ** attempt);
    }
  }
  if (lastErr instanceof TypeError) {
    const host = new URL(base).host;
    throw new SyncError(
      `Couldn't reach ${host}. Check the URL and your connection. If both are fine, the host may not allow cross-origin requests (CORS).`
    );
  }
  throw lastErr instanceof Error ? new SyncError(lastErr.message) : new SyncError(String(lastErr));
}

/** Reads the mirror's data version. Throws a readable error if the URL is not a 5etools repo root. */
export async function fetchRemoteVersion(baseUrl: string): Promise<string> {
  const base = normalizeBase(baseUrl);
  let pkg: any;
  try {
    pkg = await fetchJson(base, 'package.json', { fresh: true, retries: 1 });
  } catch (e) {
    if (e instanceof SyncError && e.message.startsWith('Not found')) {
      throw new SyncError("There's no package.json at this URL, so it doesn't look like the root of a 5etools repo.");
    }
    throw e;
  }
  if (!pkg?.version) throw new SyncError('package.json has no version, so this is not a 5etools repo root.');
  return String(pkg.version);
}

async function pool<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await worker(items[next++]);
    })
  );
}

/** Downloads, resolves and normalises everything. Writes nothing, so a failure never touches the cache. */
export async function fetchAndBuild(
  baseUrl: string,
  onProgress: (p: Progress) => void = () => {}
): Promise<{ version: string; entities: Entity[]; report: SyncReport }> {
  const base = normalizeBase(baseUrl);
  const version = await fetchRemoteVersion(base);

  const [books, spellIndex, classIndex] = await Promise.all([
    fetchJson(base, 'data/books.json'),
    fetchJson(base, 'data/spells/index.json'),
    fetchJson(base, 'data/class/index.json')
  ]);

  const files: FileSpec[] = [
    ...STATIC_FILES.map((f) => ({ ...f, path: `data/${f.path}` })),
    ...Object.values<string>(spellIndex).map((f) => ({ path: `data/spells/${f}`, keys: ['spell'] })),
    ...Object.values<string>(classIndex).map((f) => ({
      path: `data/class/${f}`,
      keys: ['class', 'subclass', 'classFeature', 'subclassFeature']
    }))
  ];

  const groups = new Map<string, Obj[]>();
  const failedFiles: string[] = [];
  let done = 0;
  onProgress({ done, total: files.length, label: 'Downloading' });

  await pool(files, 5, async (f) => {
    try {
      const data = await fetchJson(base, f.path);
      for (const key of f.keys) {
        const list = data?.[key];
        if (Array.isArray(list)) groups.set(key, [...(groups.get(key) ?? []), ...list]);
      }
    } catch (e) {
      if (e instanceof SyncError && e.message.startsWith("Couldn't reach")) throw e;
      failedFiles.push(f.path);
    }
    onProgress({ done: ++done, total: files.length, label: 'Downloading' });
  });

  if (failedFiles.length > files.length / 2) {
    throw new SyncError(`Most files failed to download (${failedFiles.length} of ${files.length}). Try again.`);
  }

  onProgress({ done, total: files.length, label: 'Resolving' });
  const report: SyncReport = {
    version,
    entities: 0,
    duplicates: 0,
    skipped: 0,
    failedFiles,
    copies: 0,
    unresolved: 0,
    unsupported: {},
    counts: {}
  };

  const resolved = new Map<string, Obj[]>();
  for (const [type, list] of groups) resolved.set(type, resolveGroup(type, list, report));

  const tagged = [...resolved.values()].flat().filter((e) => e.source).map((e) => ({ source: e.source, edition: e.edition }));
  const editionOf = makeEditionResolver(tagged, books.book ?? []);

  const byId = new Map<string, Entity>();
  for (const [type, list] of resolved) {
    for (const e of list) {
      const name: string | undefined = e.name ?? e.raceName; // unnamed subraces take their race's name
      if (!name || !e.source) {
        report.skipped++;
        continue;
      }
      const id = `${type}|${identityKey(type, e)}`;
      if (byId.has(id)) {
        report.duplicates++;
        continue;
      }
      const edition = editionOf({ source: e.source, edition: e.edition });
      byId.set(id, {
        id,
        type,
        name,
        source: e.source,
        edition,
        level: typeof e.level === 'number' ? e.level : undefined,
        json: e
      });
      const row = (report.counts[type] ??= { '2014': 0, '2024': 0 });
      row[edition]++;
    }
  }

  const entities = [...byId.values()];
  report.entities = entities.length;
  return { version, entities, report };
}
