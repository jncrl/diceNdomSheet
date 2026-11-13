<script lang="ts" generics="T extends string">
  let {
    options,
    value = $bindable(),
    label
  }: {
    options: readonly { value: T; label: string }[];
    value: T;
    label: string;
  } = $props();
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
  {#each options as option (option.value)}
    <button type="button" role="radio" aria-checked={value === option.value} class:selected={value === option.value} onclick={() => (value = option.value)}>
      {option.label}
    </button>
  {/each}
</div>

<style>
  .segmented { display: flex; }

  button {
    flex: 1;
    min-height: var(--control-height);
    padding: 0 var(--space-3);
    background: transparent;
    color: inherit;
    border: 1px solid var(--color-border);
    font: inherit;
    cursor: pointer;
  }

  button + button { border-left-width: 0; }
  button:first-child { border-radius: var(--radius-md) 0 0 var(--radius-md); }
  button:last-child { border-radius: 0 var(--radius-md) var(--radius-md) 0; }

  button.selected {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-on-accent);
    font-weight: 600;
  }
</style>
