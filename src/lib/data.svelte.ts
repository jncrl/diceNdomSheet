import { db, getMeta, setMeta } from './db';
import { DEFAULT_MIRROR, SyncError, fetchAndBuild, fetchRemoteVersion, normalizeBase, type SyncReport } from './pipeline';

export const data = $state({
  ready: false,
  mirrorUrl: DEFAULT_MIRROR,
  status: 'idle' as 'idle' | 'syncing' | 'error',
  progress: { done: 0, total: 0, label: '' },
  error: null as string | null,
  version: null as string | null,
  syncedAt: null as number | null,
  report: null as SyncReport | null,
  remoteVersion: null as string | null,
  persisted: null as boolean | null
});

export const updateAvailable = () => !!data.version && !!data.remoteVersion && data.remoteVersion !== data.version;

export async function loadData() {
  data.mirrorUrl = (await getMeta<string>('mirrorUrl')) ?? DEFAULT_MIRROR;
  data.version = (await getMeta<string>('version')) ?? null;
  data.syncedAt = (await getMeta<number>('syncedAt')) ?? null;
  data.report = (await getMeta<SyncReport>('report')) ?? null;
  data.ready = true;
  if (data.version && navigator.onLine) void checkRemoteVersion();
}

export async function checkRemoteVersion() {
  try {
    data.remoteVersion = await fetchRemoteVersion(data.mirrorUrl);
  } catch {
    // Checking is best effort. Being offline or the mirror being down is not an error worth showing.
  }
}

export async function saveMirrorUrl(url: string) {
  data.mirrorUrl = normalizeBase(url);
  await setMeta('mirrorUrl', data.mirrorUrl);
  data.remoteVersion = null;
}

export const resetMirrorUrl = () => saveMirrorUrl(DEFAULT_MIRROR);

export async function runSync() {
  if (data.status === 'syncing') return;
  data.status = 'syncing';
  data.error = null;
  try {
    await saveMirrorUrl(data.mirrorUrl);
    const { version, entities, report } = await fetchAndBuild(data.mirrorUrl, (p) => Object.assign(data.progress, p));
    data.progress.label = 'Saving';
    // One transaction: either the whole new dataset lands or the old one stays untouched.
    await db.transaction('rw', db.entities, db.meta, async () => {
      await db.entities.clear();
      await db.entities.bulkPut(entities);
      await db.meta.bulkPut([
        { key: 'version', value: version },
        { key: 'syncedAt', value: Date.now() },
        { key: 'report', value: report }
      ]);
    });
    data.version = version;
    data.remoteVersion = version;
    data.syncedAt = Date.now();
    data.report = report;
    if (navigator.storage?.persist) data.persisted = await navigator.storage.persist();
    data.status = 'idle';
  } catch (e) {
    data.error = e instanceof SyncError ? e.message : `Sync failed: ${e instanceof Error ? e.message : String(e)}`;
    data.status = 'error';
  }
}
