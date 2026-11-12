<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variant = 'primary' | 'secondary' | 'ghost';

  let {
    children,
    variant = 'secondary',
    class: className = '',
    disabled = false,
    type = 'button',
    onclick,
    ...rest
  }: {
    children: Snippet;
    variant?: Variant;
    class?: string;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (event: MouseEvent) => void;
    [key: string]: unknown;
  } = $props();
</script>

<button class:primary={variant === 'primary'} class:ghost={variant === 'ghost'} class={className} {disabled} {type} {onclick} {...rest}>
  {@render children()}
</button>

<style>
  button {
    min-height: var(--control-height);
    padding: 0 var(--space-4);
    border: 1px solid var(--color-border);
    background: transparent;
    color: inherit;
    border-radius: var(--radius-md);
    font: inherit;
    cursor: pointer;
  }

  button.primary {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-on-accent);
    font-weight: 600;
  }

  button.ghost {
    border-color: transparent;
    background: transparent;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
