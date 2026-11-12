<script lang="ts">
  import { getCatalog, loadEntity } from './catalog';
  import { db } from './db';
  import Entries from './Entries.svelte';
  import {
    TYPE_LABELS, castingTime, classFeatureRefs, featPrereq, hitDie, itemFacts, levelSchool, saves,
    spellComponents, spellDuration, spellRange, speciesFacts, subclassFeatureRefs
  } from './format';
  import type { Entity } from './pipeline';
  import Rich from './Rich.svelte';

  let { id }: { id: string } = $props();

  const entityP = $derived(loadEntity(id));
  $effect(() => {
    id;
    document.querySelector('main')?.scrollTo(0, 0);
  });

  const sourceName = (s: string) => getCatalog()?.sourceNames[s] ?? s;

  function facts(e: Entity): [string, string][] {
    const j = e.json;
    switch (e.type) {
      case 'spell':
        return [
          ['Casting time', castingTime(j.time)], ['Range', spellRange(j.range)],
          ['Components', spellComponents(j.components)], ['Duration', spellDuration(j.duration)],
          ['Classes', (e.classes ?? []).join(', ')]
        ];
      case 'class':
        return [['Hit die', hitDie(j)], ['Saving throws', saves(j)]];
      case 'subclass':
        return [['Class', j.className]];
      case 'race':
      case 'subrace':
        return speciesFacts(j);
      case 'item':
      case 'baseitem':
        return itemFacts(j);
      case 'feat':
        return [['Prerequisite', featPrereq(j)]];
      case 'classFeature':
        return [['Class', `${j.className}, level ${j.level}`]];
      case 'subclassFeature':
        return [['Subclass', `${j.subclassShortName} (${j.className}), level ${j.level}`]];
      default:
        return [];
    }
  }

  const subtitle = (e: Entity) => (e.type === 'spell' ? levelSchool(e.json) : TYPE_LABELS[e.type] ?? e.type);

  /** Features a class or subclass grants, with their full text, in level order. */
  async function features(e: Entity): Promise<{ level: number; ent: Entity }[]> {
    const refs = e.type === 'class' ? classFeatureRefs(e.json) : e.type === 'subclass' ? subclassFeatureRefs(e.json) : [];
    const found = await db.entities.bulkGet(refs.map((r) => r.id));
    return refs
      .map((r, i) => ({ level: r.level, ent: found[i] }))
      .filter((x): x is { level: number; ent: Entity } => !!x.ent)
      .sort((a, b) => a.level - b.level);
  }

  async function subclasses(e: Entity): Promise<Entity[]> {
    if (e.type !== 'class') return [];
    const all = await db.entities.where('type').equals('subclass').toArray();
    return all.filter((s) => s.json.className === e.name && s.json.classSource === e.source).sort((a, b) => a.name.localeCompare(b.name));
  }
</script>

{#await entityP}
  <p class="muted">Loading</p>
{:then e}
  {#if !e}
    <p class="muted">This entry isn't in your downloaded data. It may have been removed by a newer sync.</p>
  {:else}
    <article>
      <h2>{e.name}</h2>
      <p class="sub">{subtitle(e)}</p>
      <p class="meta">
        <span class="pill">{e.edition}</span>
        {sourceName(e.source)}{e.json.page ? `, p. ${e.json.page}` : ''}
      </p>

      {#if facts(e).filter(([, v]) => v).length}
        <dl>
          {#each facts(e).filter(([, v]) => v) as [k, v]}
            <dt>{k}</dt>
            <dd><Rich text={v} edition={e.edition} /></dd>
          {/each}
        </dl>
      {/if}

      {#if e.json._unresolved}
        <p class="warn">Part of this entry is missing because the entry it is based on isn't in the data.</p>
      {/if}

      {#if e.type === 'background' && e.json.skillProficiencies}
        <p class="sub2">Skill proficiencies: {e.json.skillProficiencies.flatMap((o: any) => Object.keys(o).filter((k) => o[k] === true)).join(', ')}</p>
      {/if}

      <Entries entry={e.json.entries ?? e.json.entry} edition={e.edition} />
      {#if e.json.entriesHigherLevel}
        <Entries entry={e.json.entriesHigherLevel} edition={e.edition} />
      {/if}

      {#if e.type === 'class' || e.type === 'subclass'}
        {#await features(e) then feats}
          {#if feats.length}
            <h3>Features</h3>
            {#each feats as f}
              <details>
                <summary><span class="lvl">Level {f.level}</span> {f.ent.name}</summary>
                <Entries entry={f.ent.json.entries} edition={e.edition} depth={1} />
              </details>
            {/each}
          {/if}
        {/await}
      {/if}

      {#if e.type === 'class'}
        {#await subclasses(e) then subs}
          {#if subs.length}
            <h3>Subclasses</h3>
            <ul class="links">
              {#each subs as s}
                <li><a href={`#browse/${encodeURIComponent(s.id)}`}>{s.name}</a> <span class="muted">{s.source}</span></li>
              {/each}
            </ul>
          {/if}
        {/await}
      {/if}
    </article>
  {/if}
{/await}

<style>
  article { max-width: 40rem; padding-bottom: 2rem; }
  h2 { font-size: 1.6rem; }
  h3 { font-size: 1.15rem; margin: 1.5rem 0 0.5rem; }
  .sub { margin: 0.1rem 0 0; font-style: italic; }
  .sub2 { margin: 0.5rem 0; }
  .meta { margin: 0.2rem 0 0.9rem; color: var(--muted); font-size: 0.875rem; }
  .pill { border: 1px solid var(--line); border-radius: 999px; padding: 0 0.5rem; margin-right: 0.35rem; }
  .muted { color: var(--muted); }
  .warn { color: var(--brass); }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 0.2rem 1rem; margin: 0 0 1rem; padding: 0.75rem 0; border-block: 1px solid var(--line); }
  dt { color: var(--muted); }
  dd { margin: 0; }
  details { border-bottom: 1px solid var(--line); padding: 0.4rem 0; }
  summary { cursor: pointer; font-weight: 600; min-height: 36px; display: flex; align-items: center; gap: 0.6rem; }
  .lvl { color: var(--muted); font-weight: 400; min-width: 4.5rem; }
  .links { padding-left: 1.2rem; }
  .links a { color: var(--verdigris); }
</style>
