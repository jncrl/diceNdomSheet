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

## Milestone 1: mirror sync, cache, resolver

Settings > Book data. The mirror URL is pre-filled with the public mirror-3 repo and is editable.
One mirror covers both rulesets: 2014 and 2024 content live side by side and are told apart by
edition tags, then by source.

- **Sync** downloads ~54 JSON files (~12 MB), resolves `_copy`/`_mod` inheritance, tags each entity
  2014 or 2024, and saves everything in one IndexedDB transaction. A failed sync leaves the old
  data untouched.
- **Update check** runs on launch when online and shows a banner if the mirror's version changed.
- **Errors** say what went wrong: unreachable host or CORS, missing `package.json`, partial download.

Known gaps, deliberately left for M2:
- Generic magic variants (+1 Armor and similar, ~225 entries with no source) are skipped.
- Spell class lists (which spells a class can learn) need the generated lookup file.
- Fluff (lore, art) and the long-form book text are not downloaded yet.
- Edition for mixed sources like Unearthed Arcana (`AU`) is a best guess.

### M1 acceptance test (phone)
- [ ] Settings > Download book data shows a progress bar and finishes.
- [ ] The table shows non-zero 2014 and 2024 counts (about 525 and 513 spells).
- [ ] Data version shows, and Last synced shows today.
- [ ] Airplane mode, reopen the app: version and counts are still there.
- [ ] Enter a bad URL, tap Sync: a readable error appears and the old data stays.

### Dev scripts
```
npx tsx scripts/test-pipeline.ts   # live download + resolve + edition report
npx tsx scripts/test-db.ts         # same, plus save/read through Dexie (fake IndexedDB)
```

## Roadmap
M1 mirror sync and cache | M2 search and detail | M3 characters and creation |
M4 pinning and spell slots | M5 play-time basics and level-up | M6 avatar builder | M7 hardening
