<script lang="ts">
  import { app, install } from './app/app-state.svelte';
  import DataCard from './DataCard.svelte';
  import Button from './ui/Button.svelte';
  import Card from './ui/Card.svelte';
</script>

<Card title="App status">
  <dl>
    <dt>Install</dt>
    <dd>
      {#if app.installed}
        Running as an installed app
      {:else if app.installEvent}
        <Button variant="primary" onclick={install}>Install on this device</Button>
      {:else}
        Open the browser menu and choose Add to Home screen
      {/if}
    </dd>
    <dt>Offline use</dt>
    <dd>{app.offlineReady ? 'Ready. The app now works without a connection.' : 'Not cached yet. Open the app once while online.'}</dd>
    <dt>Connection</dt>
    <dd>{app.online ? 'Online' : 'Offline'}</dd>
    <dt>Base path</dt>
    <dd><code>{import.meta.env.BASE_URL}</code></dd>
  </dl>
</Card>
<DataCard />

<style>
  dl { margin: 0; display: grid; gap: 0.15rem; }
  dt { color: var(--color-text-muted); font-size: var(--font-size-sm); margin-top: 0.6rem; }
  dd { margin: 0; }
  code { color: var(--color-accent); }
</style>
