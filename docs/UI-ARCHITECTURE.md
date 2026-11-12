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

## Compatibility and migration

Existing components still consume legacy variables such as `--ink`, `--panel`, `--line`, `--bone`, `--muted`, `--verdigris`, `--brass`, `--danger` and `--nav-h`. These remain as aliases in `tokens.css` during migration.

Do not remove or rename these aliases until a repository-wide search confirms that no component uses them. New code should use semantic variables such as `--color-background`, `--color-surface`, `--color-text`, `--color-accent`, `--space-4` and `--radius-md`.

## Acceptance checks

- Changing the semantic palette changes the appearance without changing feature code.
- Changing typography and spacing tokens does not alter feature behaviour.
- Existing M2 search, filters, detail navigation, offline use and sync continue to work after UI refactors.
- New character features can be rendered with a different theme without changing character data or rules.
- Domain logic can be tested without mounting Svelte components.
