# Game.ts Rule 3 Refactor (2026-03-29)

## What changed
- `rgfn_game/js/Game.ts` is now a thin entrypoint re-exporting `game/GameFacade.ts`.
- Core runtime responsibilities were split into dedicated classes:
  - `GameQuestRuntime` (quest state/progress orchestration)
  - `GamePersistenceRuntime` (save/load and snapshot checks)
  - `GameWorldInteractionRuntime` (world map interaction and village prompt UX)
  - `GameFactory` (runtime wiring and dependency assembly)

## Why
- Enforce style guide rule 3: keep files below 200 LOC.
- Improve maintainability and isolate concerns for future testing.

## Follow-up ideas
- Add focused unit tests for each runtime class.
- Remove type-casts around state machine and replace with explicit interface contracts.
- Break `GameFactory` event binding into composable binders if more callbacks are added.

## Game UI event binder Rule 3 follow-up (2026-03-30)

### What changed
- Refactored `rgfn_game/js/systems/game/GameUiEventBinder.ts` into an orchestration-only binder.
- Extracted dedicated classes to keep each file below 200 LOC and split responsibilities clearly:
  - `GameUiPrimaryEventBinder` for canvas, battle, world, and village event wiring.
  - `GameUiDevStatBinder` for developer modal/events and stat/spell upgrade controls.
  - `GameUiHudPanelController` for HUD menu toggles, draggable panel headers, close actions, and spawn positioning.
  - `GameUiEventBinderTypes` for shared callback/panel toggle types.

### Why this structure
- Preserves existing runtime behavior while enforcing style guide rule 3.
- Reduces risk in future edits by isolating high-churn UI concerns (developer panel, HUD windows, village interactions).
- Keeps folder child count at 10 files (style guide rule 16) while still achieving meaningful class extraction.

### Practical lessons captured
- For large event-bind files, split by interaction domain first (`primary`, `dev+stats`, `hud panels`) before micro-optimizing individual methods.
- Keep the top-level binder as composition-only wiring; this provides a stable seam for tests and future dependency injection.
- Rule 3 compliance is easier to sustain when callback contracts are centralized in one type module.
