<script lang="ts">
  let {
    label,
    value = $bindable(''),
    rows = 5,
    placeholder = '',
    onchange
  }: {
    label: string;
    value?: string;
    rows?: number;
    placeholder?: string;
    onchange?: () => void;
  } = $props();
</script>

<label>
  <span>{label}</span>
  <textarea bind:value {rows} {placeholder} {onchange}></textarea>
</label>

<style>
  label { display: grid; gap: var(--space-1); }

  span { color: var(--color-text-muted); font-size: var(--font-size-sm); }

  textarea {
    padding: var(--space-3);
    background: var(--color-background);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font: inherit;
    resize: vertical;
  }
</style>
