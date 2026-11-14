<script lang="ts">
  import { onMount } from 'svelte';
  import { getCatalog } from './catalog';
  import { buildComparison, type Comparison } from './compare';
  import { db } from './db';
  import type { Edition } from './edition';
  import Entries from './Entries.svelte';
  import type { Entity } from './pipeline';
  import Button from './ui/Button.svelte';

  let {
    ids,
    canPick,
    onpick
  }: {
    ids: string[];
    canPick?: (id: string) => boolean;
    onpick?: (id: string) => void;
  } = $props();

  let comparison = $state<Comparison | null>(null);
  let open = $state<string | null>(null);

  onMount(async () => {
    const found = (await db.entities.bulkGet(ids)).filter((e): e is Entity => !!e);
    const names = getCatalog()?.sourceNames ?? {};
    comparison = buildComparison(found, (s) => names[s] ?? s);
  });
</script>

{#if !comparison}
  <p class="muted">Loading...</p>
{:else if comparison.columns.length < 2}
  <p class="muted">Not enough entries to compare.</p>
{:else}
  {@const cols = comparison.columns}
  <div class="scroll">
    <table>
      <thead>
        <tr>
          <th></th>
          {#each cols as col}
            <th scope="col">
              <strong>{col.name}</strong>
              <small>{col.sourceName}</small>
              <small>{col.source} · {col.edition}</small>
              {#if onpick}
                {#if canPick ? canPick(col.id) : true}
                  <Button onclick={() => onpick(col.id)}>Use this</Button>
                {:else}
                  <small>Other ruleset</small>
                {/if}
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each comparison.facts as row}
          <tr class:differs={row.differs}>
            <th scope="row">{row.label}</th>
            {#each row.values as value}<td>{value}</td>{/each}
          </tr>
        {/each}
      </tbody>
      {#if comparison.traits.length}
        <tbody>
          <tr class="section"><th colspan={cols.length + 1}>Traits and features</th></tr>
          {#each comparison.traits as trait}
            <tr class:differs={trait.differs}>
              <th scope="row">
                {#if trait.entries.some(Boolean)}
                  <button type="button" aria-expanded={open === trait.key} onclick={() => (open = open === trait.key ? null : trait.key)}>{trait.name}</button>
                {:else}
                  {trait.name}
                {/if}
              </th>
              {#each trait.cells as cell}<td>{cell}</td>{/each}
            </tr>
            {#if open === trait.key}
              <tr class="text">
                <td colspan={cols.length + 1}>
                  {#each trait.entries as entry, i}
                    {#if entry}
                      <h4>{cols[i].source} · {cols[i].edition}</h4>
                      <Entries {entry} edition={cols[i].edition as Edition} />
                    {/if}
                  {/each}
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      {/if}
    </table>
  </div>
  <p class="muted legend">Highlighted rows differ between versions.</p>
{/if}

<style>
  .muted { color: var(--color-text-muted); margin: 0; }
  .legend { font-size: var(--font-size-sm); }

  .scroll { overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius-md); }

  table { border-collapse: collapse; width: 100%; background: var(--color-surface); }

  th, td { padding: var(--space-2) var(--space-3); text-align: left; vertical-align: top; border-bottom: 1px solid var(--color-border); }
  td { min-width: 9rem; }

  thead th { vertical-align: bottom; }
  thead th small { display: block; color: var(--color-text-muted); font-weight: 400; font-size: var(--font-size-sm); }
  thead th :global(button) { margin-top: var(--space-2); }

  tbody th[scope='row'], thead th:first-child {
    position: sticky;
    left: 0;
    min-width: 7rem;
    background: var(--color-surface);
    color: var(--color-text-muted);
    font-weight: 600;
  }

  tr.differs th, tr.differs td { background: color-mix(in srgb, var(--color-accent) 14%, var(--color-surface)); }

  tr.section th { background: var(--color-background); color: var(--color-text); position: static; }

  th button { background: none; border: 0; padding: 0; font: inherit; font-weight: 600; color: var(--color-accent); text-align: left; cursor: pointer; text-decoration: underline; }

  tr.text td { background: var(--color-background); }
  tr.text h4 { margin: var(--space-3) 0 var(--space-1); color: var(--color-accent-strong); }
</style>
