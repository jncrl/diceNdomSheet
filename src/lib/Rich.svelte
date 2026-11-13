<script lang="ts">
  import Rich from './Rich.svelte';
  import { resolveLink } from './catalog';
  import type { Edition } from './edition';
  import { FORMAT_TAGS, linkTarget, parseInline, tagText } from './tags';

  let { text, edition }: { text: string; edition?: Edition } = $props();
  const nodes = $derived(parseInline(String(text)));
</script>

{#each nodes as n}{#if n.t === 'text'}{n.v}{:else if FORMAT_TAGS[n.name]}<svelte:element this={FORMAT_TAGS[n.name]}><Rich text={n.raw} {edition} /></svelte:element>{:else}{@const t = linkTarget(n.name, n.raw)}{@const id = t ? resolveLink(t, edition) : null}{#if t && id}<a class="ref" href={`#browse/${encodeURIComponent(id)}`}>{t.display}</a>{:else}{t ? t.display : tagText(n.name, n.raw)}{/if}{/if}{/each}

<style>
  .ref { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }
</style>
