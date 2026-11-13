<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from './app/navigation';
  import { ensureCatalog, type Catalog } from './catalog';
  import { speciesOptions, subspeciesOptions } from './characters/species';
  import type { Character } from './characters/model';
  import Detail from './Detail.svelte';
  import { runSearch } from './search';
  import Button from './ui/Button.svelte';
  import Card from './ui/Card.svelte';
  import Input from './ui/Input.svelte';
  import OptionList from './ui/OptionList.svelte';

  let { character, onchoose }: { character: Character; onchoose: (species?: string, subspecies?: string) => void } = $props();

  let catalog = $state<Catalog | null | undefined>(undefined); // undefined while loading, null if no book data yet
  let query = $state('');
  let showDetails = $state(false);

  onMount(async () => {
    catalog = await ensureCatalog();
  });

  const ruleset = $derived(character.details.ruleset);
  const species = $derived(character.choices.species);
  const subspecies = $derived(character.choices.subspecies);
  const filter = $derived({ types: ['race'], edition: ruleset, source: '', level: '', school: '', className: '' });

  const results = $derived(
    !catalog ? [] : query.trim() ? runSearch(catalog.index, catalog.list, query, filter) : speciesOptions(catalog.list, ruleset)
  );
  const speciesList = $derived(results.map((m) => ({ value: m.id, label: m.name, hint: m.source })));
  const subspeciesList = $derived(
    catalog && species ? subspeciesOptions(catalog.list, species).map((m) => ({ value: m.id, label: m.name, hint: m.source })) : []
  );
  const chosenName = $derived(species ? (catalog?.byId.get(species)?.name ?? species) : '');

  function pickSpecies(id: string) {
    showDetails = false;
    onchoose(id, undefined);
  }
</script>

{#if catalog === undefined}
  <p class="muted">Loading book data...</p>
{:else if catalog === null}
  <Card title="Book data needed">
    <p>Species come from the book data. Download it in Settings first.</p>
    <Button variant="primary" onclick={() => navigate('settings')}>Open Settings</Button>
  </Card>
{:else}
  {#if species}
    <Card title={chosenName}>
      <p class="muted">{ruleset} rules{subspecies ? ` · ${catalog.byId.get(subspecies)?.name ?? ''}` : ''}</p>
      <div class="actions">
        <Button onclick={() => (showDetails = !showDetails)}>{showDetails ? 'Hide details' : 'Show details'}</Button>
        <Button variant="ghost" onclick={() => onchoose(undefined, undefined)}>Clear</Button>
      </div>
    </Card>
    {#if showDetails}<Detail id={species} />{/if}
  {/if}

  {#if subspeciesList.length}
    <h3>Variant</h3>
    <OptionList
      label="Variant"
      options={[{ value: '', label: 'None (base species)' }, ...subspeciesList]}
      value={subspecies ?? ''}
      onselect={(id) => onchoose(species, id || undefined)}
    />
  {/if}

  <h3>{species ? 'Change species' : 'Choose a species'}</h3>
  <Input label="Search species" bind:value={query} placeholder="e.g. elf" />
  {#if speciesList.length}
    <OptionList label="Species" options={speciesList} value={species} onselect={pickSpecies} />
  {:else}
    <p class="muted">No {ruleset} species match.</p>
  {/if}
{/if}

<style>
  h3 { font-size: var(--font-size-md); margin-top: var(--space-2); }
  .muted { color: var(--color-text-muted); }
  .actions { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
  p { margin: 0; }
</style>
