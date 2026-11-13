<script lang="ts">
  import Entries from './Entries.svelte';
  import Rich from './Rich.svelte';
  import { resolveLink } from './catalog';
  import type { Edition } from './edition';
  import { ABILITIES, refId } from './format';

  let { entry, edition, depth = 0 }: { entry: any; edition?: Edition; depth?: number } = $props();

  const warned = new Set<string>();
  function unsupported(t: string) {
    if (!warned.has(t)) {
      warned.add(t);
      console.warn('Unsupported entry type:', t);
    }
    return t;
  }

  const attrs = (a: string[] = []) => a.map((x) => ABILITIES[x] ?? x).join(' or ');
  const rollText = (r: any) => (r.exact !== undefined ? String(r.exact) : r.min === r.max ? String(r.min) : `${r.min}\u2013${r.max}`);
  const refTarget = (kind: 'classFeature' | 'subclassFeature', s: string) => {
    const id = refId(kind, s);
    return { id: resolveLink({ type: kind, name: s.split('|')[0], display: s.split('|')[0], id, explicitSource: true }, edition), name: s.split('|')[0] };
  };
</script>

{#if typeof entry === 'string' || typeof entry === 'number'}
  <p><Rich text={String(entry)} {edition} /></p>
{:else if Array.isArray(entry)}
  {#each entry as e}<Entries entry={e} {edition} {depth} />{/each}
{:else if entry && typeof entry === 'object'}
  {#if entry.type === 'table'}
    <div class="tbl">
      {#if entry.caption}<div class="cap">{entry.caption}</div>{/if}
      <div class="scroll">
        <table>
          {#if entry.colLabels}
            <thead><tr>{#each entry.colLabels as l}<th><Rich text={String(l)} {edition} /></th>{/each}</tr></thead>
          {/if}
          <tbody>
            {#each entry.rows ?? [] as row}
              <tr>
                {#each row.type === 'row' ? row.row : row as cell}
                  <td>
                    {#if cell && typeof cell === 'object' && cell.type === 'cell'}
                      {#if cell.roll}{rollText(cell.roll)}{:else if cell.entry}<Entries entry={cell.entry} {edition} depth={depth + 1} />{/if}
                    {:else if cell && typeof cell === 'object'}
                      <Entries entry={cell} {edition} depth={depth + 1} />
                    {:else}
                      <Rich text={String(cell)} {edition} />
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else if entry.type === 'list'}
    <ul class:plain={entry.style === 'list-no-bullets'}>
      {#each entry.items ?? [] as item}
        <li>
          {#if typeof item === 'string'}
            <Rich text={item} {edition} />
          {:else if item.type === 'item' || item.type === 'itemSub'}
            <strong><Rich text={item.name} {edition} /></strong>{' '}
            {#if item.entry}<span class="inline"><Entries entry={item.entry} {edition} depth={depth + 1} /></span>{:else if item.entries}<Entries entry={item.entries} {edition} depth={depth + 1} />{/if}
          {:else}
            <Entries entry={item} {edition} depth={depth + 1} />
          {/if}
        </li>
      {/each}
    </ul>
  {:else if entry.type === 'inset' || entry.type === 'insetReadaloud'}
    <aside class="inset">
      {#if entry.name}<div class="name">{entry.name}</div>{/if}
      <Entries entry={entry.entries} {edition} depth={depth + 1} />
    </aside>
  {:else if entry.type === 'quote'}
    <blockquote>
      <Entries entry={entry.entries} {edition} depth={depth + 1} />
      {#if entry.by}<footer>{entry.by}</footer>{/if}
    </blockquote>
  {:else if entry.type === 'abilityDc'}
    <p class="center"><strong>{entry.name} save DC</strong> = 8 + your proficiency bonus + your {attrs(entry.attributes)} modifier</p>
  {:else if entry.type === 'abilityAttackMod'}
    <p class="center"><strong>{entry.name} attack modifier</strong> = your proficiency bonus + your {attrs(entry.attributes)} modifier</p>
  {:else if entry.type === 'refClassFeature' || entry.type === 'refSubclassFeature'}
    {@const r = refTarget(entry.type === 'refClassFeature' ? 'classFeature' : 'subclassFeature', entry.classFeature ?? entry.subclassFeature)}
    <p>{#if r.id}<a class="ref" href={`#browse/${encodeURIComponent(r.id)}`}>{r.name}</a>{:else}{r.name}{/if}</p>
  {:else if entry.type === 'hr'}
    <hr />
  {:else if entry.type === 'image' || entry.type === 'gallery'}
    <!-- artwork is not downloaded -->
  {:else if entry.type === 'item' && (entry.entry || entry.entries)}
    <p><strong><Rich text={entry.name} {edition} /></strong> <span class="inline"><Entries entry={entry.entry ?? entry.entries} {edition} depth={depth + 1} /></span></p>
  {:else if entry.entries || entry.entry || entry.items}
    <section class="blk">
      {#if entry.name}
        <div class="h" class:top={depth === 0}><Rich text={entry.name} {edition} /></div>
      {/if}
      <Entries entry={entry.entries ?? entry.entry ?? entry.items} {edition} depth={depth + 1} />
    </section>
  {:else}
    <p class="muted">[{unsupported(String(entry.type ?? 'unknown'))}]</p>
  {/if}
{/if}

<style>
  p { margin: 0.5rem 0; }
  .inline :global(p) { display: inline; margin: 0; }
  .muted { color: var(--color-text-muted); font-size: 0.85rem; }
  .center { text-align: center; }
  .blk { margin: 0.25rem 0; }
  .h { font-weight: 700; margin: 0.9rem 0 0.15rem; }
  .h.top { font-family: 'Iowan Old Style', Palatino, 'Noto Serif', Georgia, serif; font-size: 1.15rem; }
  ul { margin: 0.5rem 0; padding-left: 1.25rem; }
  ul.plain { list-style: none; padding-left: 0; }
  li { margin: 0.2rem 0; }
  .inset { margin: 0.75rem 0; padding: 0.25rem 0.9rem; border-left: 3px solid var(--color-accent-strong); background: color-mix(in srgb, var(--color-surface) 70%, transparent); }
  .inset .name { font-weight: 700; margin-top: 0.4rem; }
  blockquote { margin: 0.75rem 0; padding-left: 0.9rem; border-left: 3px solid var(--color-border); color: var(--color-text-muted); }
  blockquote footer { text-align: right; font-size: 0.875rem; }
  .tbl { margin: 0.75rem 0; }
  .cap { font-weight: 700; margin-bottom: 0.25rem; }
  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; min-width: 100%; font-size: 0.9rem; }
  th, td { text-align: left; padding: 0.3rem 0.6rem 0.3rem 0; border-bottom: 1px solid var(--color-border); vertical-align: top; }
  th { color: var(--color-text-muted); font-weight: 600; }
  td :global(p) { margin: 0; }
  hr { border: 0; border-top: 1px solid var(--color-border); margin: 1rem 0; }
  .ref { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }
</style>
