<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from './app/navigation';
  import { applyClassChoice, applySubclassChoice } from './characters/classes';
  import type { Character, Choice } from './characters/model';
  import { loadCharacter, setBackground, setClasses, setSpecies } from './characters/store.svelte';
  import CharacterSheet from './CharacterSheet.svelte';
  import ClassStep from './ClassStep.svelte';
  import EntryPicker from './EntryPicker.svelte';
  import SpeciesStep from './SpeciesStep.svelte';
  import Button from './ui/Button.svelte';

  // route is `<id>` for the sheet, `<id>/<picker>` for a pick-from-book screen, and
  // `<id>/class/<row>` (or `<id>/class/new`) for the class picker.
  let { route }: { route: string } = $props();

  const parse = () => {
    const [id, picker = '', arg = ''] = route.split('/');
    return { id, picker, row: arg === 'new' || arg === '' ? null : Number(arg) };
  };
  const { id, picker, row } = parse();
  let classRow = $state<number | null>(row); // the class row being picked, null until one is added

  let character = $state<Character | null | undefined>(undefined); // undefined while loading, null if not found

  onMount(async () => {
    character = (await loadCharacter(id)) ?? null;
  });

  async function chooseSpecies(species?: Choice, subspecies?: Choice) {
    if (!character) return;
    const updated = await setSpecies(character.id, species, subspecies);
    if (updated) character = updated;
  }

  async function chooseBackground(background?: Choice) {
    if (!character) return;
    const updated = await setBackground(character.id, background);
    if (updated) character = updated;
  }

  // The editor's character is reactive state; take plain copies before building new lists from it.
  async function chooseClass(choice?: Choice) {
    if (!character) return;
    const result = applyClassChoice($state.snapshot(character.choices.classes), classRow, choice);
    const updated = await setClasses(character.id, result.classes);
    if (!updated) return;
    character = updated;
    classRow = result.index;
  }

  async function chooseSubclass(choice?: Choice) {
    if (!character || classRow === null) return;
    const updated = await setClasses(character.id, applySubclassChoice($state.snapshot(character.choices.classes), classRow, choice));
    if (updated) character = updated;
  }

  const back = () => (picker ? navigate('characters', id) : navigate('characters'));
</script>

<div class="bar">
  <Button variant="ghost" onclick={back}>{picker ? 'Back to sheet' : 'Back to characters'}</Button>
</div>

{#if character === undefined}
  <p class="muted">Loading...</p>
{:else if character === null}
  <p class="muted">This character no longer exists.</p>
{:else}
  <h2>{character.details.name}</h2>
  {#if picker === 'species'}
    <SpeciesStep {character} onchoose={chooseSpecies} />
    <div class="done"><Button variant="primary" onclick={back}>Done</Button></div>
  {:else if picker === 'background'}
    <EntryPicker
      type="background"
      noun="background"
      plural="backgrounds"
      example="e.g. sage"
      ruleset={character.details.ruleset}
      selected={character.choices.background}
      onchoose={chooseBackground}
    />
    <div class="done"><Button variant="primary" onclick={back}>Done</Button></div>
  {:else if picker === 'class'}
    <ClassStep {character} index={classRow} onclass={chooseClass} onsubclass={chooseSubclass} />
    <div class="done"><Button variant="primary" onclick={back}>Done</Button></div>
  {:else}
    <CharacterSheet {character} />
  {/if}
{/if}

<style>
  .bar { display: flex; }
  .done { margin-top: var(--space-2); }
  .muted { color: var(--color-text-muted); margin: 0; }
  h2 { font-size: var(--font-size-lg); }
</style>
