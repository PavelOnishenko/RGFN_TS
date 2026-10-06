# World ferry travel popup (dock interaction)

## What changed

- Stepping onto a ferry dock no longer teleports the player automatically.
- A ferry popup is now always shown when the current dock has one or more connected ferry routes.
- The popup lists only destinations connected to the current dock cell.
- The popup shows the current ferry fare and requires explicit confirmation (`✓ Sail`) or cancellation (`✕ Stay`).

## Gameplay rules

1. **Activation**: player steps onto a ferry dock tile with available ferry routes.
2. **Route scope**: selectable routes are constrained to `getFerryRoutesAtPlayerPosition()` only.
3. **Price**: `max(1, round(waterCells * 2))` gold.
4. **Confirmation required**: travel happens only via ferry prompt confirm action.
5. **Insufficient gold**: no travel; a log entry explains the required fare.
6. **Travel log narration**: on success, log includes payment and crossing narration.

## Implementation map

- Ferry prompt state and selection:
  - `js/systems/world-mode/WorldModeFerryPromptController.ts`
- Ferry prompt orchestration during movement/travel:
  - `js/systems/world-mode/WorldModeTravelEncounterController.ts`
  - `js/systems/world/worldMap/WorldModeController.ts`
- Dock route querying + selected route execution:
  - `js/systems/world/worldMap/WorldMapVillageNavigationAndRender.ts`
- UI wiring:
  - `index.html` (`#world-ferry-popup`)
  - `style.css` (`.world-ferry-*` classes)
  - `js/game/runtime/GameWorldInteractionRuntime.ts`
  - `js/systems/game/ui/*` event + model bindings

## Debugging checklist

- If ferry popup does not appear, confirm the dock has generated routes from `getFerryRoutesAtPlayerPosition()`.
- If selected route does not change price, verify select change event reaches `setFerryPromptRouteIndex(...)`.
- If travel still happens instantly, check no direct calls remain to old auto-travel path (`tryUseFerryAtPlayerPosition`).
- If destination labels look generic, it means destination cell is not a village or named location and falls back to `Dock (col, row)`.
