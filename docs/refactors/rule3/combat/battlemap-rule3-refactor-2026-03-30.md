# BattleMap.ts Rule 3 Refactor (2026-03-30)

## Why this refactor was required

- Style guide **Rule 3** requires files to stay below 200 LOC.
- `rgfn_game/js/systems/combat/BattleMap.ts` was 498 LOC before this change.
- The file mixed four concerns: setup/spawn, obstacle generation, pathfinding/navigation, and selected-cell UI info.

## What was extracted

### 1) `BattleMapObstacleGenerator`

- Owns terrain obstacle profile selection.
- Owns reserved-cell logic for spawn lanes.
- Owns candidate generation, random placement, adjacency limiting, and connectivity guards.
- Owns melee-lane existence checks from enemy start areas toward player spawn.

### 2) `BattleMapNavigation`

- Owns movement/pathfinding mechanics used by combat actions.
- Encapsulates BFS path search and path reconstruction.
- Exposes utility helpers for entity position, directional stepping, attack distance checks, and occupancy checks.

### 3) `BattleMapSelectionInfo`

- Owns selected-cell info projection for the UI panel.
- Centralizes occupant naming and obstacle name formatting.
- Keeps BattleMap focused on orchestration.

## Resulting architecture

- `BattleMap` now acts as an orchestrator/facade.
- Helper classes are independent and easier to test in isolation.
- All new/modified files in this refactor are below 200 LOC.

## Useful maintenance notes

- The obstacle generator currently uses its own obstacle-only path existence check (ignoring entities), matching setup-time behavior where no entities are yet placed.
- `BattleMapNavigation` receives providers (`obstaclesProvider`, `entitiesProvider`) so it always sees latest mutable state without tight coupling.
- Selected-cell info logic now has a single entry point (`BattleMapSelectionInfo.build`) for future tooltip/UI extensions.

## Follow-up ideas

- Add dedicated unit tests for:
  - obstacle connectivity and melee-lane guarantees,
  - navigation path blocking with `allowDestinationOccupied`,
  - selected-cell occupant naming fallback behavior.
- Consider applying the same decomposition strategy to `BattleMapView.ts` (currently >200 LOC) in a future pass.
