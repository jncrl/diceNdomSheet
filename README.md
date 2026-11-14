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

## Milestone 2: search, filters, detail

Browse tab. Search covers names and descriptions (typo tolerant, prefix matching, names that start
with your words rank first). Categories: Spells, Classes, Species, Backgrounds, Feats, Items, Rules,
Options, Features, Everything. Edition toggle: Both / 2014 / 2024. Filters: source (with book names),
and for spells level, school and class. Results show 50 at a time.

Opening an entry shows a stat block for its type, the full text with tables, lists and boxes, and
tappable cross-links (a spell mentioned in a feat opens that spell). Classes and subclasses list their
features by level in expandable sections, and classes list their subclasses. Each opened entry is a
history step, so the Android back button returns to your results with search and filters intact.

**One-time refresh:** if you synced under M1, open Settings and tap **Sync now** once. The search
index and spell class lists are built during sync, so the data version is unchanged and no update
banner appears.

Known gaps:
- Class progression tables (proficiency bonus, slots per level) are not shown yet.
- Browse shows species and backgrounds as book text. The character pickers (M3) read their structured facts.
- Art, fluff (lore) and generic magic variants are not included.

### M2 acceptance test (phone)
- [ ] Settings > Sync now once. Then Browse shows spells with a result count.
- [ ] Search "fireball": Fireball appears for both 2014 and 2024. "firebal" still finds it.
- [ ] Search "regain hit points" finds spells by description.
- [ ] Spells, Both, Filters: Level 3, School Evocation, Class Wizard narrows the list.
- [ ] Open a spell: stat line (casting time, range, components, duration) and text read correctly.
- [ ] Tap a linked spell or condition inside an entry: it opens. Back returns to the previous entry.
- [ ] Back to results keeps your search text and filters.
- [ ] Classes > Wizard (2024): features by level expand, subclasses are listed.
- [ ] Airplane mode: search and open entries still work.

## Milestone 3: characters (in progress)

Characters tab. The sheet is manual first: you can fill in everything by hand, so homebrew and
house rules always work, and the book pickers are optional shortcuts that fill the same fields.
Nothing is calculated.

**What exists**
- **Characters list:** create (name and ruleset, 2024 or 2014), open, delete (two taps). Each row shows
  species, classes and ruleset. Characters live in IndexedDB on the device and are never touched by a
  book-data sync.
- **Character sheet:** identity (name, species, variant, background), classes (any number of rows with
  subclass and level), the six ability scores, the 18 skill proficiencies, feats, equipment (name,
  quantity, notes) and free-text notes. It saves automatically after every change.
- **Pickers from the books:** "Choose species from book", "Choose background from book" and, in the Classes
  card, "Add class from book" (or "Choose class and subclass from book" on an existing row) open a search
  list filtered to the character's ruleset, core books first. Species with 2014 variants (subraces) get
  a variant list, and a chosen class gets its subclass list. A 2024 class lists its own 2024 subclasses
  first, then the 2014 ones written for it (marked 2014). Changing a row's class drops its subclass; the
  level stays on the sheet. Show details displays the full book text.
- **Compare:** entries with the same name in several books (a Bugbear from Volo's, Eberron and Monsters
  of the Multiverse; Acolyte in 2014 and 2024) show "N versions". Compare versions, or tick any 2 to 4
  entries with Compare, to see them side by side. Species compare creature type, size, speed, ability
  scores, skills, tools, languages and feat; backgrounds compare ability scores, feat, skills, tools,
  languages and equipment; classes compare hit die, primary ability, saving throws, skills, armor,
  weapons, tools, spellcasting, subclass title, multiclassing and equipment. Differing rows are
  highlighted. Below that is a trait table: species and backgrounds show a tick per version and tapping a
  trait shows its text; classes list each feature with the levels it arrives at (Wizard 2014 against
  2024, for example). "Use this" picks a version.

**How a selection is stored.** Species, variant, background, class, subclass and feats are saved as a
name plus an optional book id (`{ name, ref? }`). The name is always what the sheet shows, so it works
offline and for homebrew. The id links back to the book. Editing the name of a book pick turns it into a
custom entry. Records carry their own `schemaVersion` (currently 2); older records are upgraded when
read, and the same upgrade will apply to old backups. Blank rows are dropped when saving.

**Still to do in M3**
- A guided ability score step (standard array, point buy, rolled).
- A guided "walk me through creation" flow on top of the pickers.
- 2024 species lineages (for example which Elf lineage) are not selectable yet, only visible in details.
- Backup and restore: export one character or all as versioned JSON, import with validation, duplicate
  id handling. The backup format will be versioned separately from the database schema.

### M3 acceptance test (phone)
- [ ] Characters > New character: a 2014 character opens its sheet.
- [ ] Edit the name, a class level and an ability score, reload: the changes stuck.
- [ ] Choose species from book: search "bugbear", see "3 versions", Compare versions, tap a trait to read it,
      Use this. The sheet shows the species. Editing the species text marks it custom in the picker.
- [ ] Choose background from book: pick Acolyte, then Compare versions (2014 vs 2024).
- [ ] Add a class row with no name, reload: it quietly disappears, no error.
- [ ] Add class from book: pick Wizard, then a subclass, back to the sheet, set the level. Change the class and
      confirm the subclass clears. Compare versions on Wizard (2014 against 2024) and read the feature levels.
- [ ] A 2024 character lists 2024 species, backgrounds and classes only.
- [ ] Airplane mode: the list, the sheet and the pickers still work.
- [ ] Sync now in Settings: your characters are still there.

## Architecture

`docs/UI-ARCHITECTURE.md` is the reference. In short, five concerns stay separate:
- **Design tokens:** `src/styles/tokens.css`, semantic names only. Restyling is a one-file change.
- **Shared UI primitives:** `src/lib/ui` (Button, Card, inputs, lists, shell and navigation). No business logic.
- **Feature screens:** `src/lib/*.svelte` (Browse, Characters, CharacterSheet, EntryPicker, Compare, Settings).
- **Domain logic:** `src/lib/characters/` (model, validation, migration, species rules, service) and
  `src/lib/compare.ts`. Pure TypeScript, no Svelte or database imports.
- **Persistence:** `src/lib/db.ts` (Dexie schema) and `src/lib/characters/repository.ts`.

The page skeleton lives in `src/lib/ui/AppShell.svelte`, the screen list and routing in
`src/lib/app/navigation.ts`, and app-wide runtime state (install, offline, updates) in
`src/lib/app/app-state.svelte.ts`.

## Branches, checks and previews

- `main` is production. The `Deploy to GitHub Pages` workflow publishes it.
- `chatgpt/m3-development` carries M3 work. It is not merged to `main` until M3 is complete and tested.
  Nothing merges without explicit approval.
- The `Validate` workflow (`.github/workflows/validate.yml`) runs type checks, the offline tests and a
  production build on the development branch and on pull requests to `main`.
- A separate Cloudflare Pages project builds the development branch for phone testing. Cloudflare serves
  from the site root, so it builds without `BASE_PATH`. The preview has its own storage, so sync book data
  once there.

### Tests and dev scripts
```
npm test                            # offline: character model/storage/migration and comparison logic (also runs in CI)
npx tsx scripts/test-pipeline.ts    # live download + resolve + edition report
npx tsx scripts/test-db.ts          # same, plus save/read through Dexie (fake IndexedDB)
npx tsx scripts/test-search.ts      # tag parser + search ranking and filters on live data
npx tsx scripts/test-render.ts      # server-renders every entity, reports unsupported entry types
```
The last four need network access to the mirror, so they are not part of CI.

## Roadmap
M0 scaffold and PWA (done) | M1 mirror sync and cache (done) | M2 search and detail (done) |
M3 characters and creation (in progress) | M4 pinning and spell slots | M5 play-time basics and level-up |
M6 avatar builder | M7 hardening
