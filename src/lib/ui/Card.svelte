<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    children,
    class: className = ''
  }: {
    children: Snippet;
    class?: string;
  } = $props();
</script>

<section class={className}>
  {@render children()}
</section>

<style>
  section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-5);
  }
</style>
