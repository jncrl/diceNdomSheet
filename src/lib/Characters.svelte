<script lang="ts">
  import { onMount } from 'svelte';
  import { characterSummary } from './characters/model';
  import { addCharacter, deleteCharacter, loadRoster, roster } from './characters/store.svelte';
  import Button from './ui/Button.svelte';
  import Card from './ui/Card.svelte';
  import Input from './ui/Input.svelte';
  import Segmented from './ui/Segmented.svelte';

  const rulesets = [
    { value: '2024', label: '2024 rules' },
    { value: '2014', label: '2014 rules' }
  ] as const;

  let creating = $state(false);
  let name = $state('');
  let ruleset = $state<'2014' | '2024'>('2024');
  let busy = $state(false);
  let confirmingId = $state<string | null>(null);

  onMount(() => void loadRoster());

  function startCreate() {
    name = '';
    creating = true;
  }

  async function create() {
    if (!name.trim() || busy) return;
    busy = true;
    const ok = await addCharacter({ name, ruleset });
    busy = false;
    if (ok) creating = false;
  }

  const updated = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
</script>

{#if roster.error}<p class="error" role="alert">{roster.error}</p>{/if}

{#if creating}
  <Card title="New character">
    <form onsubmit={(e) => { e.preventDefault(); void create(); }}>
      <Input label="Name" bind:value={name} maxlength={60} placeholder="Character name" />
      <Segmented label="Ruleset" options={rulesets} bind:value={ruleset} />
      <div class="actions">
        <Button type="submit" variant="primary" disabled={!name.trim() || busy}>Create</Button>
        <Button variant="ghost" onclick={() => (creating = false)}>Cancel</Button>
      </div>
    </form>
  </Card>
{:else}
  <div><Button variant="primary" onclick={startCreate}>New character</Button></div>
{/if}

{#if roster.ready && roster.items.length === 0}
  <p class="empty">No characters yet.</p>
{/if}

<ul>
  {#each roster.items as character (character.id)}
    <li>
      <div class="info">
        <strong>{character.details.name}</strong>
        <span>{characterSummary(character)} · Updated {updated(character.updatedAt)}</span>
      </div>
      {#if confirmingId === character.id}
        <div class="actions">
          <Button onclick={() => { confirmingId = null; void deleteCharacter(character.id); }}>Delete</Button>
          <Button variant="ghost" onclick={() => (confirmingId = null)}>Keep</Button>
        </div>
      {:else}
        <Button variant="ghost" aria-label={`Delete ${character.details.name}`} onclick={() => (confirmingId = character.id)}>Delete</Button>
      {/if}
    </li>
  {/each}
</ul>

<style>
  form { display: grid; gap: var(--space-4); }
  .actions { display: flex; gap: var(--space-2); }
  .empty { color: var(--color-text-muted); max-width: var(--card-max-width); }
  .error { color: var(--color-danger); }

  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); max-width: var(--card-max-width); }

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .info { display: grid; min-width: 0; }
  .info strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .info span { color: var(--color-text-muted); font-size: var(--font-size-sm); }
</style>
