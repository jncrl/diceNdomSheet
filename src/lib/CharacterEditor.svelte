<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from './app/navigation';
  import type { Character } from './characters/model';
  import { creationSteps } from './characters/steps';
  import { loadCharacter, setSpecies } from './characters/store.svelte';
  import SpeciesStep from './SpeciesStep.svelte';
  import Button from './ui/Button.svelte';

  let { id }: { id: string } = $props();

  let character = $state<Character | null | undefined>(undefined); // undefined while loading, null if not found
  let stepIndex = $state(0);

  onMount(async () => {
    character = (await loadCharacter(id)) ?? null;
  });

  const step = $derived(creationSteps[stepIndex]);

  async function chooseSpecies(species?: string, subspecies?: string) {
    if (!character) return;
    const updated = await setSpecies(character.id, species, subspecies);
    if (updated) character = updated;
  }
</script>

<div class="bar">
  <Button variant="ghost" onclick={() => navigate('characters')}>Back to characters</Button>
</div>

{#if character === undefined}
  <p class="muted">Loading...</p>
{:else if character === null}
  <p class="muted">This character no longer exists.</p>
{:else}
  <h2>{character.details.name}</h2>
  <p class="muted">Step {stepIndex + 1} of {creationSteps.length}: {step.label}</p>

  {#if step.id === 'species'}
    <SpeciesStep {character} onchoose={chooseSpecies} />
  {/if}

  <div class="nav">
    {#if stepIndex > 0}<Button onclick={() => stepIndex--}>Previous</Button>{/if}
    {#if stepIndex < creationSteps.length - 1}
      <Button variant="primary" onclick={() => stepIndex++}>Next</Button>
    {:else}
      <Button variant="primary" onclick={() => navigate('characters')}>Done</Button>
    {/if}
  </div>
{/if}

<style>
  .bar { display: flex; }
  .nav { display: flex; gap: var(--space-2); margin-top: var(--space-2); }
  .muted { color: var(--color-text-muted); margin: 0; }
  h2 { font-size: var(--font-size-lg); }
</style>
