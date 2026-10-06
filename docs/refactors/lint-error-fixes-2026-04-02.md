# RGFN lint error fixes (2026-04-02)

## Scope
Fixed `style-guide/function-length-error` violations in RGFN TypeScript so `npm run lint:ts:rgfn:eslint` exits successfully (warnings remain intentionally out of scope).

## What was changed
- Broke up long methods into helper methods in quest runtime, combat resolver, HUD/controller wiring, world-mode movement + travel handling, world map persistence/render/cache layers, and item discovery UI assembly.
- Refactored `GameHudElementsFactory` into grouped element factories (`top-level`, `player stats`, `magic+inventory`, `panels`, `selected cell`) to keep function bodies under the hard limit.
- Preserved existing gameplay behavior and APIs; changes are structural/lint-oriented.

## Files touched
- `rgfn_game/js/game/runtime/GameQuestRuntime.ts`
- `rgfn_game/js/systems/combat/DirectionalCombatExchangeResolver.ts`
- `rgfn_game/js/systems/controllers/HudController.ts`
- `rgfn_game/js/systems/controllers/lore/LoreBookController.ts`
- `rgfn_game/js/systems/game/BattleTurnController.ts`
- `rgfn_game/js/systems/game/runtime/GameDeveloperUiFactory.ts`
- `rgfn_game/js/systems/game/runtime/GameHudElementsFactory.ts`
- `rgfn_game/js/systems/village/actions/VillageDialogueInteractionService.ts`
- `rgfn_game/js/systems/world-mode/WorldModeMovementInput.ts`
- `rgfn_game/js/systems/world-mode/WorldModeTravelEncounterController.ts`
- `rgfn_game/js/systems/world/WorldMapGeometryUtils.ts`
- `rgfn_game/js/systems/world/worldMap/WorldMapPersistenceAndSelection.ts`
- `rgfn_game/js/systems/world/worldMap/WorldMapVillageNavigationAndRender.ts`
- `rgfn_game/js/systems/world/worldMap/layers/WorldMapTerrainCacheRenderer.ts`
- `rgfn_game/js/ui/ItemDiscoverySplash.ts`

## Verification commands run
1. `npm run lint:ts:rgfn:eslint`
   - Result: **pass** (0 errors, warnings remain).
2. `npm run build:rgfn`
   - Result: **pass**.
3. `node --test rgfn_game/test/**/*.test.js`
   - Result: **pass** (`123/123`).

## Notes for future passes
- RGFN still has many non-blocking style warnings (`function-length-warning`, file length warnings, arrow-style recommendations, and max-len/rule17 formatting warnings).
- A next optimization pass can safely target warning classes without changing runtime behavior.
