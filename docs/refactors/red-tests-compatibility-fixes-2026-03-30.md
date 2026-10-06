# RGFN Red Test Fixes — Test Import Realignment (2026-03-30)

## Context

The earlier fix introduced compatibility adapter files to preserve legacy import paths.

That approach was removed per review feedback. The codebase now keeps the refactored runtime layout, and tests were updated to import from the canonical compiled `dist` paths directly.

## What changed

### 1) Tests now import canonical dist paths

Key updates:

- `dist/config/balanceConfig.js` -> `dist/config/balance/balanceConfig.js`
- `dist/entities/Player.js` -> `dist/entities/player/Player.js`
- `dist/systems/magic/MagicSystem.js` -> `dist/systems/controllers/magic/MagicSystem.js`
- `dist/systems/quest/QuestLeafFactory.js` -> `dist/systems/quest/generation/QuestLeafFactory.js`
- `dist/systems/quest/QuestPackService.js` -> `dist/systems/quest/generation/QuestPackService.js`
- `dist/systems/world/WorldMap.js` -> `dist/systems/world/worldMap/WorldMap.js`
- `dist/systems/world/WorldMapRenderer.js` -> `dist/systems/world/worldMap/WorldMapRenderer.js`
- `dist/systems/WorldModeController.js` -> `dist/systems/world/worldMap/WorldModeController.js`

### 2) Scenario helper imports now use the real helper location

Scenario tests were changed to import helper utilities from `test/helpers/testUtils.js` using correct relative paths (no compatibility helper file under `test/systems/helpers/`).

### 3) Scenario tests align with current controller APIs

- `battleCommandController` scenarios now trigger loot flow via `handleTargetDefeated` + `resolvePendingLoot` instead of relying on a removed compatibility `collectLoot` surface.
- `villageActionsController` scenario reads person-direction hints through `barterService.getPersonDirectionHint(...)` instead of a removed compatibility method.

## Removed from prior attempt

The following temporary compatibility files were deleted:

- `js/config/balanceConfig.ts`
- `js/entities/Player.ts`
- `js/systems/WorldModeController.ts`
- `js/systems/magic/MagicSystem.ts`
- `js/systems/quest/QuestLeafFactory.ts`
- `js/systems/quest/QuestPackService.ts`
- `js/systems/world/WorldMap.ts`
- `js/systems/world/WorldMapRenderer.ts`
- `test/systems/helpers/testUtils.js`

And temporary compatibility methods added in runtime classes were reverted.

## Verification

- `npm run build:rgfn`
- `node --test $(find rgfn_game/test -name '*.test.js' | sort)`

## Practical takeaway

When source folders are reorganized, prefer updating tests to canonical import paths (runtime truth) rather than adding adapter files—unless backward compatibility is explicitly required by production consumers.
