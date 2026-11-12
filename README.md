# Tome Sheet

Offline-first D&D character sheet and book reference (PWA). Svelte 5 + Vite + TypeScript.
5etools data is fetched at runtime from a mirror URL you set. None is bundled in this repo.

## Milestone 0: scaffold, deploy, install

### Run locally
```
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

### Deploy to GitHub Pages
1. Create a **public** GitHub repo and push this project to the `main` branch.
2. Repo **Settings > Pages > Build and deployment > Source: GitHub Actions**.
3. The `Deploy to GitHub Pages` workflow runs on every push to `main`. It sets
   `BASE_PATH=/<repo-name>/` automatically, so the manifest scope, start URL and
   service worker all match the repo subpath.
4. Your app lives at `https://<username>.github.io/<repo-name>/`.

### M0 acceptance test (on your Android phone, in Chrome)
- [ ] The site loads over HTTPS.
- [ ] Settings tab shows "Install on this device" (or use menu > Add to Home screen).
- [ ] After installing, it opens full-screen with the book icon.
- [ ] Settings shows "Offline use: Ready".
- [ ] Turn on airplane mode, fully close and reopen the app: it still loads.
- [ ] Android back button steps back through tabs.
- [ ] Base path under Settings matches your repo name.

### Regenerate icons
```
python3 scripts/make-icons.py   # needs Pillow
```

## Roadmap
M1 mirror sync and cache | M2 search and detail | M3 characters and creation |
M4 pinning and spell slots | M5 play-time basics and level-up | M6 avatar builder | M7 hardening
