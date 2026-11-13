# UI architecture

## Goal

The application must be redesignable without rewriting its features, rules engine, or data layer. Treat this as an architectural constraint for all new work, including M3.

## Layers

1. **Design tokens**: colours, typography, spacing, sizing, borders, radii and layout values. Defined centrally in `src/styles/tokens.css`.
2. **Reusable UI components**: shared controls and visual primitives such as buttons, cards, fields, dialogs and navigation. These own presentation and accessibility, not feature rules.
3. **Feature components**: Browse, Characters, Character Creator and Settings. They compose reusable UI and call feature services.
4. **Application/domain services**: character rules, calculations, search, sync, backup/restore and persistence. These must not depend on Svelte components or visual styling.

## Rules for implementation

- New feature components must use semantic design tokens, not hardcoded colour values.
- Prefer shared spacing, typography, sizing and radius tokens over one-off values.
- Do not put database access, character calculations, backup parsing or business rules in presentational components.
- Keep feature state and domain operations outside reusable UI components.
- Reusable UI components must expose behaviour through typed props and events/callbacks, not reach into feature stores.
- Keep semantic HTML, keyboard support, visible focus, touch-friendly controls and reduced-motion support.
- A theme change must be possible by changing token values or a theme selector, without changing feature logic.
- Avoid a wholesale migration of existing M2 components just to satisfy the new structure. Migrate them incrementally when touched, preserving current behaviour.

## Layout structure

Where to change what:

- **Page skeleton** (header, banners, content area, bottom nav): `src/lib/ui/AppShell.svelte`. Moving the nav or header means editing this file.
- **Navigation items and routing**: `src/lib/app/navigation.ts` holds the screen list and hash parsing. Add or reorder screens there; `NavBar.svelte` only renders the list it is given.
- **App runtime state** (connectivity, install prompt, service-worker updates): `src/lib/app/app-state.svelte.ts`.
- **Screens**: `Browse`, `Characters` (list, then `CharacterEditor` which shows `CharacterSheet` or a pick-from-book screen built on the shared `EntryPicker`, with `Compare` for side-by-side versions) and `Settings` under `src/lib`. `App.svelte` only composes the shell with the active screen.
- **Shared primitives** under `src/lib/ui`: `Button`, `Card` (optional `title`), `Banner`, `ScreenHeader`, `NavBar`, `AppShell`, and the form controls `Input`, `NumberField`, `TextArea`, `Checkbox`, `Segmented`, `OptionList` and `EditableList`. Add new primitives alongside their first real use.

## Migration status

All components now use semantic tokens. The legacy aliases (`--ink`, `--panel`, `--line`, `--bone`, `--muted`, `--verdigris`, `--brass`, `--danger`, `--nav-h`) were removed after a repository-wide search found no remaining use. Do not reintroduce them. Use semantic variables such as `--color-background`, `--color-surface`, `--color-text`, `--color-accent`, `--space-4` and `--radius-md`.

Browse, Detail and Entries still use their own local markup for inputs, chips and buttons. Convert them to shared primitives when they are next touched.

## Acceptance checks

- Changing the semantic palette changes the appearance without changing feature code.
- Changing typography and spacing tokens does not alter feature behaviour.
- Existing M2 search, filters, detail navigation, offline use and sync continue to work after UI refactors.
- New character features can be rendered with a different theme without changing character data or rules.
- Domain logic can be tested without mounting Svelte components.
