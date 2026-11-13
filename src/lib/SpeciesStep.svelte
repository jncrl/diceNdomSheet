<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from './app/navigation';
  import { ensureCatalog, type Catalog } from './catalog';
  import { speciesOptions, subspeciesOptions } from './characters/species';
  import type { Character, Choice } from './characters/model';
  import Compare from './Compare.svelte';
  import Detail from './Detail.svelte';
  import { runSearch } from './search';
  import Button from './ui/Button.svelte';
  import Card from './ui/Card.svelte';
  import Checkbox from './ui/Checkbox.svelte';
  import Input from './ui/Input.svelte';
  import OptionList from './ui/OptionList.svelte';

  let { character, onchoose }: { character: Character; onchoose: (species?: Choice, subspecies?: Choice) => void } = $props();

  let catalog = $state<Catalog | null | undefined>(undefined); // undefined while loading, null if no book data yet
  let query = $state('');
  let showDetails = $state(false);
  let comparing = $state<string[] | null>(null); // ids shown in the comparison view
  let compareMode = $state(false); // list rows become checkboxes
  let picked = $state<string[]>([]);

  onMount(async () => {
    catalog = await ensureCatalog();
  });

  const ruleset = $derived(character.details.ruleset);
  const species = $derived(character.choices.species);
  const subspecies = $derived(character.choices.subspecies);
  // Every same-named species across books and rulesets, e.g. the three Bugbears.
  const versions = $derived.by(() => {
    const byName = new Map<string, string[]>();
    for (const m of catalog?.list ?? []) if (m.type === 'race') byName.set(m.name.toLowerCase(), [...(byName.get(m.name.toLowerCase()) ?? []), m.id]);
    return byName;
  });
  const versionsOf = (id: string) => versions.get(catalog?.byId.get(id)?.name.toLowerCase() ?? '') ?? [id];
  const entry = (id: string): Choice => ({ name: catalog?.byId.get(id)?.name ?? id, ref: id });
  const filter = $derived({ types: ['race'], edition: ruleset, source: '', level: '', school: '', className: '' });

  const results = $derived(
    !catalog ? [] : query.trim() ? runSearch(catalog.index, catalog.list, query, filter) : speciesOptions(catalog.list, ruleset)
  );
  const speciesList = $derived(
    results.map((m) => {
      const n = versionsOf(m.id).length;
      return { value: m.id, label: m.name, hint: n > 1 ? `${m.source} · ${n} versions` : m.source };
    })
  );
  const subspeciesList = $derived(
    catalog && species?.ref ? subspeciesOptions(catalog.list, species.ref).map((m) => ({ value: m.id, label: m.name, hint: m.source })) : []
  );

  function pickSpecies(id: string) {
    showDetails = false;
    onchoose(entry(id), undefined);
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
    pickSpecies(id);
  }
</script>

{#if catalog === undefined}
  <p class="muted">Loading book data...</p>
{:else if catalog === null}
  <Card title="Book data needed">
    <p>Species come from the book data. Download it in Settings first.</p>
    <Button variant="primary" onclick={() => navigate('settings')}>Open Settings</Button>
  </Card>
{:else if comparing}
  <div><Button variant="ghost" onclick={() => (comparing = null)}>Back to list</Button></div>
  <Compare ids={comparing} canPick={(id) => catalog?.byId.get(id)?.edition === ruleset} onpick={finishCompare} />
{:else}
  {#if species}
    <Card title={species.name}>
      <p class="muted">{ruleset} rules{subspecies ? ` · ${subspecies.name}` : ''}{species.ref ? '' : ' · custom entry'}</p>
      <div class="actions">
        {#if species.ref}<Button onclick={() => (showDetails = !showDetails)}>{showDetails ? 'Hide details' : 'Show details'}</Button>{/if}
        {#if species.ref && versionsOf(species.ref).length > 1}<Button onclick={() => compareVersions(species.ref!)}>Compare versions</Button>{/if}
        <Button variant="ghost" onclick={() => onchoose(undefined, undefined)}>Clear</Button>
      </div>
    </Card>
    {#if showDetails && species.ref}<Detail id={species.ref} />{/if}
  {/if}

  {#if subspeciesList.length}
    <h3>Variant</h3>
    <OptionList
      label="Variant"
      options={[{ value: '', label: 'None (base species)' }, ...subspeciesList]}
      value={subspecies?.ref ?? ''}
      onselect={(id) => onchoose(species, id ? entry(id) : undefined)}
    />
  {/if}

  <h3>{species ? 'Change species' : 'Choose a species'}</h3>
  <Input label="Search species" bind:value={query} placeholder="e.g. elf" />
  <div class="actions">
    <Button onclick={() => { compareMode = !compareMode; picked = []; }}>{compareMode ? 'Cancel compare' : 'Compare species'}</Button>
    {#if compareMode}<Button variant="primary" disabled={picked.length < 2} onclick={() => (comparing = picked)}>Compare ({picked.length})</Button>{/if}
  </div>
  {#if compareMode}<p class="muted">Tick 2 to 4 species. Picking a fifth replaces the oldest.</p>{/if}
  {#if speciesList.length && compareMode}
    <div class="checks">
      {#each speciesList as option (option.value)}
        <Checkbox label={option.label} hint={option.hint} checked={picked.includes(option.value)} onchange={(on) => togglePicked(option.value, on)} />
      {/each}
    </div>
  {:else if speciesList.length}
    <OptionList label="Species" options={speciesList} value={species?.ref} onselect={pickSpecies} />
  {:else}
    <p class="muted">No {ruleset} species match.</p>
  {/if}
{/if}

<style>
  h3 { font-size: var(--font-size-md); margin-top: var(--space-2); }
  .muted { color: var(--color-text-muted); }
  .actions { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
  p { margin: 0; }
  .checks { display: grid; }
</style>
