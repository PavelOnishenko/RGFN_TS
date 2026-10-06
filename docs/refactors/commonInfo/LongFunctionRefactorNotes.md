# Long Function Refactor Notes (RGFN)

## Scope covered
- `js/config/ThemeConfig.ts`
- `js/entities/Skeleton.ts`
- `js/game/GameFactory.ts`
- `js/systems/combat/BattleMapNavigation.ts`
- `js/systems/village/VillageActionsController.ts`
- `js/systems/world/worldMap/WorldMapCore.ts`
- `js/systems/world/worldMap/WorldMapFocusAndFogOverlay.ts`
- `js/systems/world/worldMap/WorldMapTerrainCacheRenderer.ts`
- `js/systems/world/worldMap/WorldMapTerrainModeling.ts`
- `js/systems/world/worldMap/WorldMapWaterAndSettlements.ts`

## Refactor pattern used
1. Keep public orchestration methods short and readable.
2. Move repeated and decision-heavy logic to private helpers with explicit names.
3. Preserve all existing behavior and call order.
4. Prefer “extract method” over changing data flow to keep risk low.

## Practical guidance for future edits
- If a method starts mixing setup + business logic + UI updates, split by lifecycle phase (e.g., `prepare*`, `build*`, `assign*`, `finalize*`).
- If pathfinding / terrain generation methods grow, split “candidate collection” from “ranking/selection”.
- For constructors, keep only dependencies + one initialization call where possible.
- Keep helper methods side-effect scoped: each helper should either return data or mutate one area of state, not both.

## Why this matters
- The style audit flags long functions early; shorter methods reduce future lint churn.
- Smaller methods make deterministic world generation and battle control logic easier to test and debug.
- Explicit method names now document intent directly in code, reducing onboarding time for contributors.
