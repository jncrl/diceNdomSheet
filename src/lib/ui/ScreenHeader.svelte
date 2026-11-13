<script lang="ts">
  let { title, badge }: { title: string; badge?: string } = $props();
</script>

<header>
  <h1>{title}</h1>
  {#if badge}<span class="badge">{badge}</span>{/if}
</header>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5) var(--space-2);
  }

  h1 { font-size: var(--font-size-xl); }

  .badge {
    border: 1px solid var(--color-accent-strong);
    color: var(--color-accent-strong);
    border-radius: var(--radius-pill);
    padding: 0.1rem var(--space-3);
    font-size: var(--font-size-sm);
  }
</style>
