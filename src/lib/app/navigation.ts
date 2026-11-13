// Screen registry and hash routing. Pure logic with no Svelte or styling, so the
// navigation structure can change without touching any component's presentation.

export type Tab = 'browse' | 'characters' | 'settings';

export const tabs: readonly { id: Tab; label: string }[] = [
  { id: 'browse', label: 'Browse' },
  { id: 'characters', label: 'Characters' },
  { id: 'settings', label: 'Settings' }
];

// Tab lives in the URL hash so the Android back button steps through screens.
// Hash looks like `tab` or `tab/rest`. Browse uses the rest to open an entry.
export function parseHash(hash: string = location.hash): { tab: Tab; route: string } {
  const [first, ...rest] = hash.slice(1).split('/');
  const tab = (tabs.some((t) => t.id === first) ? first : 'browse') as Tab;
  return { tab, route: rest.join('/') };
}

export const navigate = (tab: Tab) => {
  location.hash = tab;
};
