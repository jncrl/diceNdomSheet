<script lang="ts">
  import type { Catalog } from './catalog';
  import type { Character, Choice } from './characters/model';
  import { subspeciesOptions } from './characters/species';
  import EntryPicker from './EntryPicker.svelte';
  import OptionList from './ui/OptionList.svelte';

  let { character, onchoose }: { character: Character; onchoose: (species?: Choice, subspecies?: Choice) => void } = $props();

  const species = $derived(character.choices.species);
  const subspecies = $derived(character.choices.subspecies);
  const entry = (catalog: Catalog, id: string): Choice => ({ name: catalog.byId.get(id)?.name ?? id, ref: id });
</script>

<EntryPicker
  type="race"
  noun="species"
  plural="species"
  example="e.g. elf"
  ruleset={character.details.ruleset}
  selected={species}
  detail={subspecies?.name}
  onchoose={(choice) => onchoose(choice, undefined)}
>
  {#snippet extra(catalog)}
    {@const variants = species?.ref ? subspeciesOptions(catalog.list, species.ref) : []}
    {#if variants.length}
      <h3>Variant</h3>
      <OptionList
        label="Variant"
        options={[{ value: '', label: 'None (base species)' }, ...variants.map((m) => ({ value: m.id, label: m.name, hint: m.source }))]}
        value={subspecies?.ref ?? ''}
        onselect={(id) => onchoose(species, id ? entry(catalog, id) : undefined)}
      />
    {/if}
  {/snippet}
</EntryPicker>

<style>
  h3 { font-size: var(--font-size-md); margin: var(--space-2) 0 0; }
</style>
