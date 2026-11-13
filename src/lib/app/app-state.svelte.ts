import { registerSW } from 'virtual:pwa-register';

// App-level runtime state: connectivity, PWA install and service-worker updates.
// Kept out of components so screens can be rearranged without moving this logic.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const app = $state({
  online: navigator.onLine,
  offlineReady: false,
  updateReady: false,
  installEvent: null as BeforeInstallPromptEvent | null,
  installed: window.matchMedia('(display-mode: standalone)').matches
});

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

export const applyUpdate = () => updateSW?.(true);

export async function install() {
  const event = app.installEvent;
  if (!event) return;
  await event.prompt();
  await event.userChoice;
  app.installEvent = null;
}

/** Registers the service worker and window listeners. Returns a cleanup function. */
export function startApp(): () => void {
  updateSW = registerSW({
    onOfflineReady: () => (app.offlineReady = true),
    onNeedRefresh: () => (app.updateReady = true)
  });

  const onOnline = () => (app.online = true);
  const onOffline = () => (app.online = false);
  const onInstallPrompt = (e: Event) => {
    e.preventDefault();
    app.installEvent = e as BeforeInstallPromptEvent;
  };
  const onInstalled = () => {
    app.installed = true;
    app.installEvent = null;
  };

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  window.addEventListener('beforeinstallprompt', onInstallPrompt);
  window.addEventListener('appinstalled', onInstalled);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('beforeinstallprompt', onInstallPrompt);
    window.removeEventListener('appinstalled', onInstalled);
  };
}
