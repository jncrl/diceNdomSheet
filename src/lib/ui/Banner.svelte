<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children, action }: { children: Snippet; action?: Snippet } = $props();
</script>

<div class="banner">
  <span>{@render children()}</span>
  {#if action}{@render action()}{/if}
</div>

<style>
  .banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    margin: var(--space-2) var(--space-5);
    padding: var(--space-2) var(--space-3) var(--space-2) var(--space-4);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-md);
  }
</style>
