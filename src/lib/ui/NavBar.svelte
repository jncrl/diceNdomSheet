<script lang="ts">
  type Item = { id: string; label: string };

  let {
    items,
    active,
    onselect,
    label = 'Main'
  }: {
    items: readonly Item[];
    active: string;
    onselect: (id: string) => void;
    label?: string;
  } = $props();
</script>

<nav aria-label={label}>
  {#each items as item (item.id)}
    <button class:active={active === item.id} aria-current={active === item.id ? 'page' : undefined} onclick={() => onselect(item.id)}>
      {item.label}
    </button>
  {/each}
</nav>

<style>
  nav {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  button {
    min-height: var(--navigation-height);
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    position: relative;
  }

  button.active { color: var(--color-text); font-weight: 600; }

  button.active::before {
    content: '';
    position: absolute;
    top: 0; left: 25%; right: 25%;
    height: 3px;
    background: var(--color-accent-strong);
    border-radius: 0 0 3px 3px;
  }
</style>
