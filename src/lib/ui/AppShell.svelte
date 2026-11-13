<script lang="ts">
  import type { Snippet } from 'svelte';

  // Page skeleton: header, optional banners, scrolling content, bottom navigation.
  // Rearranging the app layout means editing this file only.
  let {
    header,
    banners,
    nav,
    children
  }: {
    header: Snippet;
    banners?: Snippet;
    nav: Snippet;
    children: Snippet;
  } = $props();
</script>

<div class="shell">
  {@render header()}
  {#if banners}{@render banners()}{/if}
  <main>{@render children()}</main>
  {@render nav()}
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 0px);
  }

  main {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3) var(--space-5) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
</style>
