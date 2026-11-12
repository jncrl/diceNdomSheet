<script lang="ts">
  import { data, resetMirrorUrl, runSync, saveMirrorUrl, updateAvailable } from './data.svelte';
  import { DEFAULT_MIRROR } from './pipeline';

  let draft = $state(data.mirrorUrl);
  $effect(() => {
    if (data.status !== 'syncing') draft = data.mirrorUrl;
  });

  const shown = [
    ['spell', 'Spells'],
    ['class', 'Classes'],
    ['subclass', 'Subclasses'],
    ['race', 'Races and species'],
    ['background', 'Backgrounds'],
    ['feat', 'Feats'],
    ['item', 'Items']
  ] as const;

  const busy = $derived(data.status === 'syncing');
  const pct = $derived(data.progress.total ? Math.round((data.progress.done / data.progress.total) * 100) : 0);
  const when = $derived(data.syncedAt ? new Date(data.syncedAt).toLocaleString() : null);
  const isDefault = $derived(data.mirrorUrl === DEFAULT_MIRROR);

  async function sync() {
    data.mirrorUrl = draft;
    await runSync();
  }
</script>

<section class="card">
  <h2>Book data</h2>

  <label for="mirror">Mirror URL</label>
  <input id="mirror" type="url" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false" bind:value={draft} disabled={busy} />
  <p class="hint">Base URL of a 5etools repo. It covers both the 2014 and 2024 rules.</p>
  <div class="row">
    <button class="primary" onclick={sync} disabled={busy}>{data.version ? 'Sync now' : 'Download book data'}</button>
    {#if !isDefault || draft !== data.mirrorUrl}
      <button onclick={() => { void resetMirrorUrl(); draft = DEFAULT_MIRROR; }} disabled={busy}>Use default</button>
    {/if}
  </div>

  {#if busy}
    <div class="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" aria-label={data.progress.label}>
      <div style="width:{pct}%"></div>
    </div>
    <p class="hint">{data.progress.label} {data.progress.done} of {data.progress.total} files</p>
  {/if}

  {#if data.error}
    <p class="error" role="alert">{data.error}</p>
  {/if}

  {#if data.version}
    <dl>
      <dt>Data version</dt>
      <dd>
        {data.version}
        {#if updateAvailable()}<span class="update">Update available: {data.remoteVersion}</span>{/if}
      </dd>
      <dt>Last synced</dt>
      <dd>{when}</dd>
      {#if data.persisted === false}
        <dt>Storage</dt>
        <dd>The browser may clear this data when space runs low. Installing the app helps.</dd>
      {/if}
    </dl>

    {#if data.report}
      <table>
        <thead>
          <tr><th></th><th>2014</th><th>2024</th></tr>
        </thead>
        <tbody>
          {#each shown as [type, label]}
            <tr>
              <th scope="row">{label}</th>
              <td>{data.report.counts[type]?.['2014'] ?? 0}</td>
              <td>{data.report.counts[type]?.['2024'] ?? 0}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if data.report.failedFiles.length}
        <p class="error">{data.report.failedFiles.length} files failed to download. Sync again to retry.</p>
      {/if}
    {/if}
  {:else if !busy && !data.error}
    <p class="hint">Nothing downloaded yet. The download is about 12 MB.</p>
  {/if}
</section>

<style>
  label { display: block; color: var(--muted); font-size: 0.875rem; margin-top: 0.25rem; }
  input {
    width: 100%;
    min-height: 48px;
    margin-top: 0.25rem;
    padding: 0 0.75rem;
    background: var(--ink);
    color: var(--bone);
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    font: inherit;
    font-size: 0.9rem;
  }
  .hint { color: var(--muted); font-size: 0.875rem; margin: 0.4rem 0 0.75rem; }
  .row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .bar { height: 8px; border-radius: 4px; background: var(--line); margin-top: 1rem; overflow: hidden; }
  .bar div { height: 100%; background: var(--verdigris); transition: width 0.15s; }
  .error { color: var(--danger); margin: 0.75rem 0 0; }
  .update { margin-left: 0.5rem; color: var(--brass); font-size: 0.875rem; }
  dl { margin: 1rem 0 0; display: grid; gap: 0.15rem; }
  dt { color: var(--muted); font-size: 0.875rem; margin-top: 0.6rem; }
  dd { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-variant-numeric: tabular-nums; }
  th, td { padding: 0.3rem 0; text-align: right; border-bottom: 1px solid var(--line); font-weight: 400; }
  th:first-child { text-align: left; color: var(--muted); }
  thead th { color: var(--muted); font-size: 0.875rem; }
  button:disabled, input:disabled { opacity: 0.5; }
</style>
