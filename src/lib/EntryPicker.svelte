<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { navigate } from './app/navigation';
  import { ensureCatalog, type Catalog } from './catalog';
  import type { Choice } from './characters/model';
  import { pickableOptions } from './characters/options';
  import Compare from './Compare.svelte';
  import Detail from './Detail.svelte';
  import type { Edition } from './edition';
  import { runSearch } from './search';
  import Button from './ui/Button.svelte';
  import Card from './ui/Card.svelte';
  import Checkbox from './ui/Checkbox.svelte';
  import Input from './ui/Input.svelte';
  import OptionList from './ui/OptionList.svelte';

  // Pick one book entry of a single type (species, background, ...) for a character's ruleset:
  // search, same-name versions across books, side-by-side compare, and the entry's full text.
  let {
    type,
    noun,
    plural,
    example,
    ruleset,
    selected,
    detail,
    extra,
    onchoose
  }: {
    type: string; // entity type in the book data, e.g. `race`
    noun: string; // e.g. `species`
    plural: string; // e.g. `species` or `backgrounds`
    example: string; // search placeholder
    ruleset: Edition;
    selected?: Choice;
    detail?: string; // extra text shown on the selected card
    extra?: Snippet<[Catalog]>; // shown between the selected card and the list (e.g. variants)
    onchoose: (choice?: Choice) => void;
  } = $props();

  let catalog = $state<Catalog | null | undefined>(undefined); // undefined while loading, null if no book data yet
  let query = $state('');
  let showDetails = $state(false);
  let comparing = $state<string[] | null>(null); // ids shown in the comparison view
  let compareMode = $state(false); // list rows become checkboxes
  let picked = $state<string[]>([]);

  onMount(async () => {
    catalog = await ensureCatalog();
  });

  // Every same-named entry across books and rulesets, e.g. the three Bugbears.
  const versions = $derived.by(() => {
    const byName = new Map<string, string[]>();
    for (const m of catalog?.list ?? []) if (m.type === type) byName.set(m.name.toLowerCase(), [...(byName.get(m.name.toLowerCase()) ?? []), m.id]);
    return byName;
  });
  const versionsOf = (id: string) => versions.get(catalog?.byId.get(id)?.name.toLowerCase() ?? '') ?? [id];
  const filter = $derived({ types: [type], edition: ruleset, source: '', level: '', school: '', className: '' });

  const results = $derived(
    !catalog ? [] : query.trim() ? runSearch(catalog.index, catalog.list, query, filter) : pickableOptions(catalog.list, type, ruleset)
  );
  const options = $derived(
    results.map((m) => {
      const n = versionsOf(m.id).length;
      return { value: m.id, label: m.name, hint: n > 1 ? `${m.source} · ${n} versions` : m.source };
    })
  );

  function pick(id: string) {
    showDetails = false;
    onchoose({ name: catalog?.byId.get(id)?.name ?? id, ref: id });
  }

  function togglePicked(id: string, on: boolean) {
    picked = on ? [...picked.filter((x) => x !== id), id].slice(-4) : picked.filter((x) => x !== id);
  }

  function compareVersions(id: string) {
    comparing = [id, ...versionsOf(id).filter((x) => x !== id)].slice(0, 5);
  }

  function finishCompare(id: string) {
    comparing = null;
    compareMode = false;
    picked = [];
    pick(id);
  }
</script>

{#if catalog === undefined}
  <p class="muted">Loading book data...</p>
{:else if catalog === null}
  <Card title="Book data needed">
    <p>The {plural} come from the book data. Download it in Settings first.</p>
    <Button variant="primary" onclick={() => navigate('settings')}>Open Settings</Button>
  </Card>
{:else if comparing}
  <div><Button variant="ghost" onclick={() => (comparing = null)}>Back to list</Button></div>
  <Compare ids={comparing} canPick={(id) => catalog?.byId.get(id)?.edition === ruleset} onpick={finishCompare} />
{:else}
  {#if selected}
    <Card title={selected.name}>
      <p class="muted">{ruleset} rules{detail ? ` · ${detail}` : ''}{selected.ref ? '' : ' · custom entry'}</p>
      <div class="actions">
        {#if selected.ref}<Button onclick={() => (showDetails = !showDetails)}>{showDetails ? 'Hide details' : 'Show details'}</Button>{/if}
        {#if selected.ref && versionsOf(selected.ref).length > 1}<Button onclick={() => compareVersions(selected.ref!)}>Compare versions</Button>{/if}
        <Button variant="ghost" onclick={() => onchoose(undefined)}>Clear</Button>
      </div>
    </Card>
    {#if showDetails && selected.ref}<Detail id={selected.ref} />{/if}
  {/if}

  {#if extra}{@render extra(catalog)}{/if}

  <h3>{selected ? `Change ${noun}` : `Choose ${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`}</h3>
  <Input label={`Search ${plural}`} bind:value={query} placeholder={example} />
  <div class="actions">
    <Button onclick={() => { compareMode = !compareMode; picked = []; }}>{compareMode ? 'Cancel compare' : `Compare ${plural}`}</Button>
    {#if compareMode}<Button variant="primary" disabled={picked.length < 2} onclick={() => (comparing = picked)}>Compare ({picked.length})</Button>{/if}
  </div>
  {#if compareMode}<p class="muted">Tick 2 to 4 {plural}. Picking a fifth replaces the oldest.</p>{/if}
  {#if options.length && compareMode}
    <div class="checks">
      {#each options as option (option.value)}
        <Checkbox label={option.label} hint={option.hint} checked={picked.includes(option.value)} onchange={(on) => togglePicked(option.value, on)} />
      {/each}
    </div>
  {:else if options.length}
    <OptionList label={plural} {options} value={selected?.ref} onselect={pick} />
  {:else}
    <p class="muted">No {ruleset} {plural} match.</p>
  {/if}
{/if}

<style>
  h3 { font-size: var(--font-size-md); margin-top: var(--space-2); }
  .muted { color: var(--color-text-muted); }
  .actions { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
  p { margin: 0; }
  .checks { display: grid; }
</style>
