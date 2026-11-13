<script lang="ts" generics="T extends string">
  let {
    options,
    value,
    label,
    onselect
  }: {
    options: readonly { value: T; label: string; hint?: string }[];
    value?: T;
    label: string;
    onselect: (value: T) => void;
  } = $props();
</script>

<ul role="radiogroup" aria-label={label}>
  {#each options as option (option.value)}
    <li>
      <button type="button" role="radio" aria-checked={value === option.value} class:selected={value === option.value} onclick={() => onselect(option.value)}>
        <span>{option.label}</span>
        {#if option.hint}<small>{option.hint}</small>{/if}
      </button>
    </li>
  {/each}
</ul>

<style>
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }

  button {
    width: 100%;
    min-height: var(--control-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 0 var(--space-4);
    background: var(--color-surface);
    color: inherit;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  small { color: var(--color-text-muted); font-size: var(--font-size-sm); }

  button.selected {
    border-color: var(--color-accent);
    box-shadow: inset 0 0 0 1px var(--color-accent);
    font-weight: 600;
  }
</style>
