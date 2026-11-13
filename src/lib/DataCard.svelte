<script lang="ts">
  import { data, resetMirrorUrl, runSync, updateAvailable } from './data.svelte';
  import { DEFAULT_MIRROR } from './pipeline';
  import Button from './ui/Button.svelte';
  import Card from './ui/Card.svelte';

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

<Card title="Book data">
  <label for="mirror">Mirror URL</label>
  <input id="mirror" type="url" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false" bind:value={draft} disabled={busy} />
  <p class="hint">Base URL of a 5etools repo. It covers both the 2014 and 2024 rules.</p>
  <div class="row">
    <Button variant="primary" onclick={sync} disabled={busy}>{data.version ? 'Sync now' : 'Download book data'}</Button>
    {#if !isDefault || draft !== data.mirrorUrl}
      <Button onclick={() => { void resetMirrorUrl(); draft = DEFAULT_MIRROR; }} disabled={busy}>Use default</Button>
    {/if}
  </div>

  {#if busy}
    <div class="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" aria-label={data.progress.label}>
      <div style="width:{pct}%"></div>
    </div>
    <p class="hint">{data.progress.label} {data.progress.done} of {data.progress.total} files</p>
  {/if}
  {#if data.error}<p class="error" role="alert">{data.error}</p>{/if}

  {#if data.version}
    <dl>
      <dt>Data version</dt>
      <dd>{data.version}{#if updateAvailable()}<span class="update">Update available: {data.remoteVersion}</span>{/if}</dd>
      <dt>Last synced</dt>
      <dd>{when}</dd>
      {#if data.persisted === false}
        <dt>Storage</dt>
        <dd>The browser may clear this data when space runs low. Installing the app helps.</dd>
      {/if}
    </dl>
    {#if data.report}
      <table>
        <thead><tr><th></th><th>2014</th><th>2024</th></tr></thead>
        <tbody>
          {#each shown as [type, label]}
            <tr><th scope="row">{label}</th><td>{data.report.counts[type]?.['2014'] ?? 0}</td><td>{data.report.counts[type]?.['2024'] ?? 0}</td></tr>
          {/each}
        </tbody>
      </table>
      {#if data.report.failedFiles.length}<p class="error">{data.report.failedFiles.length} files failed to download. Sync again to retry.</p>{/if}
    {/if}
  {:else if !busy && !data.error}
    <p class="hint">Nothing downloaded yet. The download is about 12 MB.</p>
  {/if}
</Card>

<style>
  label { display: block; color: var(--color-text-muted); font-size: var(--font-size-sm); margin-top: var(--space-1); }
  input {
    width: 100%; min-height: var(--control-height); margin-top: var(--space-1); padding: 0 var(--space-3);
    background: var(--color-background); color: var(--color-text); border: 1px solid var(--color-border);
    border-radius: var(--radius-md); font: inherit; font-size: 0.9rem;
  }
  .hint { color: var(--color-text-muted); font-size: var(--font-size-sm); margin: var(--space-2) 0 var(--space-3); }
  .row { display: flex; gap: var(--space-2); flex-wrap: wrap; }
  .bar { height: 8px; border-radius: 4px; background: var(--color-border); margin-top: var(--space-4); overflow: hidden; }
  .bar div { height: 100%; background: var(--color-accent); transition: width 0.15s; }
  .error { color: var(--color-danger); margin: var(--space-3) 0 0; }
  .update { margin-left: var(--space-2); color: var(--color-accent-strong); font-size: var(--font-size-sm); }
  dl { margin: var(--space-4) 0 0; display: grid; gap: 0.15rem; }
  dt { color: var(--color-text-muted); font-size: var(--font-size-sm); margin-top: 0.6rem; }
  dd { margin: 0; }
  input:disabled { opacity: 0.5; }
  table { width: 100%; border-collapse: collapse; margin-top: var(--space-4); font-variant-numeric: tabular-nums; }
  th, td { padding: 0.3rem 0; text-align: right; border-bottom: 1px solid var(--color-border); font-weight: 400; }
  th:first-child { text-align: left; color: var(--color-text-muted); }
  thead th { color: var(--color-text-muted); font-size: var(--font-size-sm); }
</style>
