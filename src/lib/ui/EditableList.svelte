<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';

  let {
    items,
    row,
    onadd,
    onremove,
    addLabel = 'Add',
    empty = ''
  }: {
    items: readonly T[];
    row: Snippet<[T, number]>;
    onadd: () => void;
    onremove: (index: number) => void;
    addLabel?: string;
    empty?: string;
  } = $props();
</script>

<div class="list">
  {#if items.length === 0 && empty}<p class="empty">{empty}</p>{/if}
  {#each items as item, i}
    <div class="row">
      <div class="fields">{@render row(item, i)}</div>
      <Button variant="ghost" aria-label="Remove" onclick={() => onremove(i)}>Remove</Button>
    </div>
  {/each}
  <div><Button onclick={onadd}>{addLabel}</Button></div>
</div>

<style>
  .list { display: grid; gap: var(--space-3); }

  .row {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .fields { display: grid; gap: var(--space-2); }
  .row :global(button) { justify-self: start; }
  .empty { margin: 0; color: var(--color-text-muted); }
</style>
