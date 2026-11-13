<script lang="ts">
  import { onMount } from 'svelte';
  import { bs, CATEGORIES, resetFilters } from './browse.svelte';
  import { ensureCatalog, type Catalog } from './catalog';
  import { data } from './data.svelte';
  import Detail from './Detail.svelte';
  import { SCHOOLS, TYPE_LABELS, levelSchool } from './format';
  import { runSearch, type Filter } from './search';

  let { route }: { route: string } = $props();

  let cat = $state.raw<Catalog | null>(null);
  let loaded = $state(false);
  let showFilters = $state(false);

  onMount(async () => {
    cat = await ensureCatalog();
    loaded = true;
  });

  const category = $derived(CATEGORIES.find((c) => c.id === bs.category) ?? CATEGORIES[0]);
  const types = $derived(category.id === 'all' && cat ? [...new Set(cat.list.map((m) => m.type))] : category.types);
  const isSpells = $derived(category.id === 'spells');

  const filter = $derived<Filter>({
    types, edition: bs.edition, source: bs.source,
    level: isSpells ? bs.level : '', school: isSpells ? bs.school : '', className: isSpells ? bs.className : ''
  });

  const results = $derived(cat ? runSearch(cat.index, cat.list, bs.query, filter) : []);
  const shown = $derived(results.slice(0, bs.limit));

  // Filter choices come from what is actually in the data for this category and edition.
  const scoped = $derived(cat ? cat.list.filter((m) => types.includes(m.type) && (bs.edition === 'all' || m.edition === bs.edition)) : []);
  const sources = $derived([...new Set(scoped.map((m) => m.source))].sort());
  const classNames = $derived.by(() => {
    const n = new Map<string, number>();
    for (const m of scoped) for (const c of m.classes ?? []) n.set(c, (n.get(c) ?? 0) + 1);
    return [...n].filter(([, c]) => c >= 5).map(([k]) => k).sort();
  });
  const activeFilters = $derived([bs.source, bs.level, bs.school, bs.className].filter((v) => v !== '').length);

  const srcName = (s: string) => cat?.sourceNames[s] ?? s;
  const subtitle = (m: { type: string; level?: number; school?: string }) =>
    m.type === 'spell' ? levelSchool({ level: m.level, school: m.school }) : TYPE_LABELS[m.type] ?? m.type;

  function pick(id: string) {
    bs.category = id;
    resetFilters();
  }
  function back() {
    if (history.length > 1) history.back();
    else location.hash = 'browse';
  }
</script>

{#if route}
  <button class="back" onclick={back}>Back to results</button>
  {#if cat}
    {#key route}<Detail id={decodeURIComponent(route)} />{/key}
  {/if}
{:else if loaded && !cat}
  {#if data.version}
    <p class="empty">Search needs a one-time refresh of your book data. <a href="#settings">Open Settings</a> and tap Sync now.</p>
  {:else}
    <p class="empty">No book data yet. <a href="#settings">Download it in Settings</a> to browse spells, classes, species and more.</p>
  {/if}
{:else if cat}
  <div class="top">
    <input type="search" placeholder="Search names and descriptions" bind:value={bs.query} oninput={() => (bs.limit = 50)} autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search" />
    <div class="chips" role="tablist" aria-label="Category">
      {#each CATEGORIES as c}
        <button role="tab" aria-selected={bs.category === c.id} class:on={bs.category === c.id} onclick={() => pick(c.id)}>{c.label}</button>
      {/each}
    </div>
    <div class="row">
      <div class="seg" role="group" aria-label="Edition">
        {#each ['all', '2014', '2024'] as ed}
          <button class:on={bs.edition === ed} aria-pressed={bs.edition === ed} onclick={() => { bs.edition = ed as typeof bs.edition; resetFilters(); }}>{ed === 'all' ? 'Both' : ed}</button>
        {/each}
      </div>
      <button class="filt" class:on={activeFilters > 0} aria-expanded={showFilters} onclick={() => (showFilters = !showFilters)}>
        Filters{activeFilters ? ` (${activeFilters})` : ''}
      </button>
    </div>

    {#if showFilters}
      <div class="filters">
        <label>Source
          <select bind:value={bs.source} onchange={() => (bs.limit = 50)}>
            <option value="">Any</option>
            {#each sources as s}<option value={s}>{s}: {srcName(s)}</option>{/each}
          </select>
        </label>
        {#if isSpells}
          <label>Level
            <select bind:value={bs.level} onchange={() => (bs.limit = 50)}>
              <option value="">Any</option>
              <option value="0">Cantrip</option>
              {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as l}<option value={String(l)}>Level {l}</option>{/each}
            </select>
          </label>
          <label>School
            <select bind:value={bs.school} onchange={() => (bs.limit = 50)}>
              <option value="">Any</option>
              {#each Object.entries(SCHOOLS) as [k, v]}<option value={k}>{v}</option>{/each}
            </select>
          </label>
          <label>Class
            <select bind:value={bs.className} onchange={() => (bs.limit = 50)}>
              <option value="">Any</option>
              {#each classNames as c}<option value={c}>{c}</option>{/each}
            </select>
          </label>
        {/if}
        {#if activeFilters}<button onclick={resetFilters}>Clear filters</button>{/if}
      </div>
    {/if}
  </div>

  <p class="count" aria-live="polite">{results.length} {results.length === 1 ? 'result' : 'results'}</p>
  <ul class="results">
    {#each shown as m (m.id)}
      <li>
        <a href={`#browse/${encodeURIComponent(m.id)}`}>
          <span class="name">{m.name}</span>
          <span class="sub">{subtitle(m)} <span class="ed">{m.edition}</span> {m.source}</span>
        </a>
      </li>
    {/each}
  </ul>
  {#if results.length > shown.length}
    <button class="more" onclick={() => (bs.limit += 50)}>Show 50 more</button>
  {/if}
  {#if !results.length}
    <p class="empty">Nothing matches. Try fewer words or clear the filters.</p>
  {/if}
{/if}

<style>
  .top { position: sticky; top: 0; z-index: 2; background: var(--color-background); padding-bottom: 0.5rem; margin: 0 -1.25rem; padding-inline: 1.25rem; display: flex; flex-direction: column; gap: 0.6rem; }
  input[type='search'] { width: 100%; min-height: 48px; padding: 0 0.9rem; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 0.5rem; font: inherit; }
  .chips { display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.25rem; scrollbar-width: none; }
  .chips button { flex: none; min-height: 40px; border-radius: 999px; }
  .on { background: var(--color-accent) !important; border-color: var(--color-accent) !important; color: var(--color-on-accent) !important; font-weight: 600; }
  .row { display: flex; gap: 0.6rem; align-items: center; justify-content: space-between; }
  .seg { display: flex; }
  .seg button { border-radius: 0; min-height: 40px; }
  .seg button:first-child { border-radius: 0.5rem 0 0 0.5rem; }
  .seg button:last-child { border-radius: 0 0.5rem 0.5rem 0; }
  .filt { min-height: 40px; }
  .filters { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; padding: 0.75rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; }
  .filters label { display: flex; flex-direction: column; gap: 0.2rem; color: var(--color-text-muted); font-size: 0.8rem; min-width: 0; }
  select { min-height: 44px; background: var(--color-background); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 0.4rem; font: inherit; width: 100%; }
  .count { color: var(--color-text-muted); font-size: 0.85rem; margin: 0.5rem 0 0.25rem; }
  .results { list-style: none; padding: 0; margin: 0; }
  .results a { display: flex; flex-direction: column; min-height: 56px; justify-content: center; padding: 0.4rem 0; border-bottom: 1px solid var(--color-border); color: inherit; text-decoration: none; }
  .name { font-weight: 600; }
  .sub { color: var(--color-text-muted); font-size: 0.85rem; }
  .ed { border: 1px solid var(--color-border); border-radius: 999px; padding: 0 0.4rem; margin: 0 0.25rem; font-size: 0.75rem; }
  .more { width: 100%; margin-top: 0.75rem; }
  .back { margin-bottom: 0.75rem; align-self: flex-start; }
  .empty { color: var(--color-text-muted); max-width: 34rem; }
  .empty a { color: var(--color-accent); }
</style>
