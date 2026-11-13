<script lang="ts">
  import { navigate } from './app/navigation';
  import { ABILITIES, withName, type Character } from './characters/model';
  import { SKILLS } from './characters/skills';
  import { saveSections } from './characters/store.svelte';
  import Button from './ui/Button.svelte';
  import Card from './ui/Card.svelte';
  import Checkbox from './ui/Checkbox.svelte';
  import EditableList from './ui/EditableList.svelte';
  import Input from './ui/Input.svelte';
  import NumberField from './ui/NumberField.svelte';
  import TextArea from './ui/TextArea.svelte';

  let { character }: { character: Character } = $props();

  // The sheet edits a private copy and saves whole sections after each change.
  const initial = () => character;
  let draft = $state<Character>(structuredClone($state.snapshot(initial())));
  let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function save() {
    status = 'saving';
    const snap = $state.snapshot(draft);
    const saved = await saveSections(snap.id, { details: snap.details, choices: snap.choices, equipment: snap.equipment });
    status = saved ? 'saved' : 'error';
  }

  async function chooseFromBook(step: string) {
    await save();
    navigate('characters', `${character.id}/${step}`);
  }

  function toggleSkill(key: string, on: boolean) {
    const rest = draft.choices.skills.filter((k) => k !== key);
    draft.choices.skills = on ? [...rest, key] : rest;
    void save();
  }

  const labels: Record<string, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  const statusText = $derived({ idle: '', saving: 'Saving...', saved: 'All changes saved', error: 'Could not save' }[status]);
</script>

<p class="status" role="status">{statusText}</p>

<Card title="Identity">
  <div class="stack">
    <Input label="Name" bind:value={draft.details.name} maxlength={60} onchange={save} />
    <p class="muted">{draft.details.ruleset} rules</p>

    <Input
      label="Species"
      bind:value={() => draft.choices.species?.name ?? '', (v) => (draft.choices.species = withName(draft.choices.species, v))}
      onchange={save}
    />
    <Input
      label="Variant (optional)"
      bind:value={() => draft.choices.subspecies?.name ?? '', (v) => (draft.choices.subspecies = withName(draft.choices.subspecies, v))}
      onchange={save}
    />
    <div><Button onclick={() => chooseFromBook('species')}>Choose species from book</Button></div>

    <Input
      label="Background"
      bind:value={() => draft.choices.background?.name ?? '', (v) => (draft.choices.background = withName(draft.choices.background, v))}
      onchange={save}
    />
    <div><Button onclick={() => chooseFromBook('background')}>Choose background from book</Button></div>
  </div>
</Card>

<Card title="Classes">
  <EditableList
    items={draft.choices.classes}
    addLabel="Add class"
    empty="No class yet."
    onadd={() => draft.choices.classes.push({ class: { name: '' }, level: 1 })}
    onremove={(i) => { draft.choices.classes.splice(i, 1); void save(); }}
  >
    {#snippet row(_, i)}
      <Input
        label="Class"
        bind:value={() => draft.choices.classes[i].class.name, (v) => (draft.choices.classes[i].class = withName(draft.choices.classes[i].class, v) ?? { name: '' })}
        onchange={save}
      />
      <Input
        label="Subclass"
        bind:value={() => draft.choices.classes[i].subclass?.name ?? '', (v) => (draft.choices.classes[i].subclass = withName(draft.choices.classes[i].subclass, v))}
        onchange={save}
      />
      <NumberField label="Level" min={1} max={20} bind:value={draft.choices.classes[i].level} onchange={save} />
    {/snippet}
  </EditableList>
</Card>

<Card title="Ability scores">
  <div class="abilities">
    {#each ABILITIES as ability}
      <NumberField label={labels[ability]} min={1} max={30} bind:value={draft.choices.abilityScores[ability]} onchange={save} />
    {/each}
  </div>
</Card>

<Card title="Skill proficiencies">
  {#each SKILLS as skill}
    <Checkbox label={skill.label} hint={skill.ability} checked={draft.choices.skills.includes(skill.key)} onchange={(on) => toggleSkill(skill.key, on)} />
  {/each}
</Card>

<Card title="Feats">
  <EditableList
    items={draft.choices.feats}
    addLabel="Add feat"
    empty="No feats yet."
    onadd={() => draft.choices.feats.push({ name: '' })}
    onremove={(i) => { draft.choices.feats.splice(i, 1); void save(); }}
  >
    {#snippet row(_, i)}
      <Input label="Feat" bind:value={() => draft.choices.feats[i].name, (v) => (draft.choices.feats[i] = withName(draft.choices.feats[i], v) ?? { name: '' })} onchange={save} />
    {/snippet}
  </EditableList>
</Card>

<Card title="Equipment">
  <EditableList
    items={draft.equipment}
    addLabel="Add item"
    empty="No equipment yet."
    onadd={() => draft.equipment.push({ name: '', quantity: 1 })}
    onremove={(i) => { draft.equipment.splice(i, 1); void save(); }}
  >
    {#snippet row(_, i)}
      <Input label="Item" bind:value={draft.equipment[i].name} onchange={save} />
      <NumberField label="Quantity" min={0} max={9999} bind:value={draft.equipment[i].quantity} onchange={save} />
      <Input label="Notes" bind:value={() => draft.equipment[i].notes ?? '', (v) => (draft.equipment[i].notes = v)} onchange={save} />
    {/snippet}
  </EditableList>
</Card>

<Card title="Notes">
  <TextArea label="Notes" bind:value={() => draft.details.notes ?? '', (v) => (draft.details.notes = v)} rows={6} onchange={save} />
</Card>

<style>
  .stack { display: grid; gap: var(--space-3); }
  .abilities { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
  .status { margin: 0; min-height: 1.2em; color: var(--color-text-muted); font-size: var(--font-size-sm); }
  .muted { margin: 0; color: var(--color-text-muted); }
</style>
