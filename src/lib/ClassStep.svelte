<script lang="ts">
  import type { Catalog } from './catalog';
  import { subclassOptions } from './characters/classes';
  import type { Character, Choice } from './characters/model';
  import EntryPicker from './EntryPicker.svelte';
  import OptionList from './ui/OptionList.svelte';

  // Picks the class (and subclass) for one row of the character's class list.
  // `index` null means a class that has not been added yet.
  let {
    character,
    index,
    onclass,
    onsubclass
  }: {
    character: Character;
    index: number | null;
    onclass: (choice?: Choice) => void;
    onsubclass: (choice?: Choice) => void;
  } = $props();

  const row = $derived(index === null ? undefined : character.choices.classes[index]);
  const ruleset = $derived(character.details.ruleset);
  const entry = (catalog: Catalog, id: string): Choice => ({ name: catalog.byId.get(id)?.name ?? id, ref: id });
</script>

<EntryPicker
  type="class"
  noun="class"
  plural="classes"
  example="e.g. wizard"
  {ruleset}
  selected={row?.class}
  detail={row?.subclass?.name}
  onchoose={onclass}
>
  {#snippet extra(catalog)}
    {@const subclasses = row?.class.ref ? subclassOptions(catalog.list, row.class.ref, ruleset) : []}
    {#if subclasses.length}
      <h3>Subclass</h3>
      <OptionList
        label="Subclass"
        options={[
          { value: '', label: 'None yet' },
          ...subclasses.map((m) => ({ value: m.id, label: m.name, hint: m.edition === ruleset ? m.source : `${m.source} · ${m.edition}` }))
        ]}
        value={row?.subclass?.ref ?? ''}
        onselect={(id) => onsubclass(id ? entry(catalog, id) : undefined)}
      />
    {/if}
  {/snippet}
</EntryPicker>

<style>
  h3 { font-size: var(--font-size-md); margin: var(--space-2) 0 0; }
</style>
