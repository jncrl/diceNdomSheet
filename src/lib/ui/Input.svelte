<script lang="ts">
  let {
    label,
    value = $bindable(''),
    placeholder = '',
    maxlength,
    autocomplete = 'off',
    class: className = ''
  }: {
    label: string;
    value?: string;
    placeholder?: string;
    maxlength?: number;
    autocomplete?: AutoFill;
    class?: string;
  } = $props();
</script>

<label class={className}>
  <span>{label}</span>
  <input type="text" bind:value {placeholder} {maxlength} {autocomplete} />
</label>

<style>
  label { display: grid; gap: var(--space-1); }

  span { color: var(--color-text-muted); font-size: var(--font-size-sm); }

  input {
    min-height: var(--control-height);
    padding: 0 var(--space-3);
    background: var(--color-background);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font: inherit;
  }

  input::placeholder { color: var(--color-text-muted); }
</style>
