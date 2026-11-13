<script lang="ts">
  import { app, applyUpdate, startApp } from './lib/app/app-state.svelte';
  import { navigate, parseHash, tabs, type Tab } from './lib/app/navigation';
  import Browse from './lib/Browse.svelte';
  import Characters from './lib/Characters.svelte';
  import { data, loadData, runSync, updateAvailable } from './lib/data.svelte';
  import Settings from './lib/Settings.svelte';
  import AppShell from './lib/ui/AppShell.svelte';
  import Banner from './lib/ui/Banner.svelte';
  import Button from './lib/ui/Button.svelte';
  import NavBar from './lib/ui/NavBar.svelte';
  import ScreenHeader from './lib/ui/ScreenHeader.svelte';

  let tab = $state<Tab>(parseHash().tab);
  let route = $state(parseHash().route);

  void loadData();

  $effect(() => {
    const onHash = () => {
      const h = parseHash();
      tab = h.tab;
      route = h.route;
    };
    window.addEventListener('hashchange', onHash);
    const stopApp = startApp();
    return () => {
      window.removeEventListener('hashchange', onHash);
      stopApp();
    };
  });
</script>

<AppShell>
  {#snippet header()}
    <ScreenHeader title={tabs.find((t) => t.id === tab)?.label ?? ''} badge={app.online ? undefined : 'Offline'} />
  {/snippet}

  {#snippet banners()}
    {#if app.updateReady}
      <Banner>
        A new version is ready.
        {#snippet action()}<Button onclick={applyUpdate}>Update now</Button>{/snippet}
      </Banner>
    {/if}
    {#if updateAvailable() && data.status !== 'syncing'}
      <Banner>
        New book data is available ({data.version} to {data.remoteVersion}).
        {#snippet action()}<Button onclick={() => { navigate('settings'); void runSync(); }}>Update data</Button>{/snippet}
      </Banner>
    {/if}
  {/snippet}

  {#if tab === 'browse'}
    <Browse {route} />
  {:else if tab === 'characters'}
    <Characters {route} />
  {:else}
    <Settings />
  {/if}

  {#snippet nav()}
    <NavBar items={tabs} active={tab} onselect={(id) => navigate(id as Tab)} />
  {/snippet}
</AppShell>
