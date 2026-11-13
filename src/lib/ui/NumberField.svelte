<script lang="ts">
  let {
    label,
    value = $bindable(0),
    min = 0,
    max = 99,
    onchange
  }: {
    label: string;
    value?: number;
    min?: number;
    max?: number;
    onchange?: () => void;
  } = $props();

  // Commits on change (blur or enter). Empty or invalid text reverts; out-of-range values clamp.
  function commit(e: Event & { currentTarget: HTMLInputElement }) {
    const el = e.currentTarget;
    const n = Math.round(Number(el.value));
    if (el.value.trim() === '' || !Number.isFinite(n)) {
      el.value = String(value);
      return;
    }
    value = Math.min(max, Math.max(min, n));
    el.value = String(value);
    onchange?.();
  }
</script>

<label>
  <span>{label}</span>
  <input type="number" inputmode="numeric" {min} {max} {value} onchange={commit} />
</label>

<style>
  label { display: grid; gap: var(--space-1); }

  span { color: var(--color-text-muted); font-size: var(--font-size-sm); }

  input {
    min-height: var(--control-height);
    width: 100%;
    padding: 0 var(--space-3);
    background: var(--color-background);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font: inherit;
  }
</style>
