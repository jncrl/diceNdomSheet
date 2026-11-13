<script lang="ts">
  let {
    label,
    hint,
    checked = false,
    onchange
  }: {
    label: string;
    hint?: string;
    checked?: boolean;
    onchange: (checked: boolean) => void;
  } = $props();
</script>

<label>
  <input type="checkbox" {checked} onchange={(e) => onchange(e.currentTarget.checked)} />
  <span>{label}</span>
  {#if hint}<small>{hint}</small>{/if}
</label>

<style>
  label {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--control-height);
    cursor: pointer;
  }

  input { width: 1.25rem; height: 1.25rem; accent-color: var(--color-accent); }

  span { flex: 1; }

  small { color: var(--color-text-muted); font-size: var(--font-size-sm); text-transform: uppercase; }
</style>
