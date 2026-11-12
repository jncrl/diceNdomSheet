<script lang="ts">
  import { registerSW } from 'virtual:pwa-register';
  import Browse from './lib/Browse.svelte';
  import DataCard from './lib/DataCard.svelte';
  import { data, loadData, updateAvailable, runSync } from './lib/data.svelte';

  type Tab = 'browse' | 'characters' | 'settings';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'browse', label: 'Browse' },
    { id: 'characters', label: 'Characters' },
    { id: 'settings', label: 'Settings' }
  ];

  // Tab lives in the URL hash so the Android back button steps through screens.
  // Hash looks like `tab` or `tab/rest`. Browse uses the rest to open an entry.
  const parseHash = () => {
    const [first, ...rest] = location.hash.slice(1).split('/');
    return { tab: (tabs.some((t) => t.id === first) ? first : 'browse') as Tab, route: rest.join('/') };
  };

  let tab = $state<Tab>(parseHash().tab);
  let route = $state(parseHash().route);
  let online = $state(navigator.onLine);
  let offlineReady = $state(false);
  let updateReady = $state(false);
  let installEvent = $state<BeforeInstallPromptEvent | null>(null);
  let installed = $state(window.matchMedia('(display-mode: standalone)').matches);

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }

  const updateSW = registerSW({
    onOfflineReady: () => (offlineReady = true),
    onNeedRefresh: () => (updateReady = true)
  });

  void loadData();

  $effect(() => {
    const onHash = () => {
      const h = parseHash();
      tab = h.tab;
      route = h.route;
    };
    const onOnline = () => (online = true);
    const onOffline = () => (online = false);
    const onInstallPrompt = (e: Event) => {
      e.preventDefault();
      installEvent = e as BeforeInstallPromptEvent;
    };
    const onInstalled = () => {
      installed = true;
      installEvent = null;
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  });

  const go = (t: Tab) => (location.hash = t);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null;
  }
</script>

<div class="shell">
  <header>
    <h1>{tabs.find((t) => t.id === tab)?.label}</h1>
    {#if !online}<span class="pill">Offline</span>{/if}
  </header>

  {#if updateReady}
    <div class="banner">
      <span>A new version is ready.</span>
      <button onclick={() => updateSW(true)}>Update now</button>
    </div>
  {/if}

  {#if updateAvailable() && data.status !== 'syncing'}
    <div class="banner">
      <span>New book data is available ({data.version} to {data.remoteVersion}).</span>
      <button onclick={() => { go('settings'); void runSync(); }}>Update data</button>
    </div>
  {/if}

  <main>
    {#if tab === 'browse'}
      <Browse {route} />
    {:else if tab === 'characters'}
      <p class="empty">No characters yet.</p>
    {:else}
      <section class="card">
        <h2>App status</h2>
        <dl>
          <dt>Install</dt>
          <dd>
            {#if installed}
              Running as an installed app
            {:else if installEvent}
              <button class="primary" onclick={install}>Install on this device</button>
            {:else}
              Open the browser menu and choose Add to Home screen
            {/if}
          </dd>
          <dt>Offline use</dt>
          <dd>{offlineReady ? 'Ready. The app now works without a connection.' : 'Not cached yet. Open the app once while online.'}</dd>
          <dt>Connection</dt>
          <dd>{online ? 'Online' : 'Offline'}</dd>
          <dt>Base path</dt>
          <dd><code>{import.meta.env.BASE_URL}</code></dd>
        </dl>
      </section>
      <DataCard />
    {/if}
  </main>

  <nav aria-label="Main">
    {#each tabs as t}
      <button class:active={tab === t.id} aria-current={tab === t.id ? 'page' : undefined} onclick={() => go(t.id)}>
        {t.label}
      </button>
    {/each}
  </nav>
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: env(safe-area-inset-top, 0px);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.5rem;
  }

  h1 { font-size: 1.6rem; }

  .pill {
    border: 1px solid var(--brass);
    color: var(--brass);
    border-radius: 999px;
    padding: 0.1rem 0.75rem;
    font-size: 0.875rem;
  }

  .banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin: 0.5rem 1.25rem;
    padding: 0.5rem 0.75rem 0.5rem 1rem;
    border: 1px solid var(--verdigris);
    border-radius: 0.5rem;
  }

  main {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .empty { color: var(--muted); max-width: 34rem; }

  .card {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    padding: 1rem 1.1rem;
    max-width: 34rem;
  }

  .card h2 { font-size: 1.15rem; margin-bottom: 0.5rem; }

  dl { margin: 0; display: grid; gap: 0.15rem; }
  dt { color: var(--muted); font-size: 0.875rem; margin-top: 0.6rem; }
  dd { margin: 0; }
  code { color: var(--verdigris); }

  button {
    min-height: 48px;
    padding: 0 1.1rem;
    border: 1px solid var(--line);
    background: transparent;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  button.primary {
    background: var(--verdigris);
    border-color: var(--verdigris);
    color: #0b1417;
    font-weight: 600;
  }

  nav {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-top: 1px solid var(--line);
    background: var(--panel);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  nav button {
    min-height: var(--nav-h);
    border: 0;
    border-radius: 0;
    color: var(--muted);
    position: relative;
  }

  nav button.active { color: var(--bone); font-weight: 600; }
  nav button.active::before {
    content: '';
    position: absolute;
    top: 0; left: 25%; right: 25%;
    height: 3px;
    background: var(--brass);
    border-radius: 0 0 3px 3px;
  }
</style>
