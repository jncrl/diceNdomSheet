<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from './app/navigation';
  import type { Character, Choice } from './characters/model';
  import { loadCharacter, setBackground, setSpecies } from './characters/store.svelte';
  import CharacterSheet from './CharacterSheet.svelte';
  import EntryPicker from './EntryPicker.svelte';
  import SpeciesStep from './SpeciesStep.svelte';
  import Button from './ui/Button.svelte';

  // route is `<id>` for the sheet or `<id>/<picker>` for a pick-from-book screen.
  let { route }: { route: string } = $props();

  const parse = () => {
    const [id, picker = ''] = route.split('/');
    return { id, picker };
  };
  const { id, picker } = parse();

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
