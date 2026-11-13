<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    children,
    title,
    class: className = ''
  }: {
    children: Snippet;
    title?: string;
    class?: string;
  } = $props();
</script>

<section class={className}>
  {#if title}<h2>{title}</h2>{/if}
  {@render children()}
</section>

<style>
  section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-5);
    max-width: var(--card-max-width);
  }

  h2 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-2);
  }
</style>
