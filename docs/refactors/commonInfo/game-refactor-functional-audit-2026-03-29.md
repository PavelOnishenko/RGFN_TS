# Game Refactor Functional Audit (2026-03-29)

## Why this audit exists
A large line delta (`+518 / -721`) can look suspicious. This audit verifies that the refactor mostly moved/split behavior rather than deleting game features.

## Key fact about the diff numbers
- Git line stats are **textual**, not behavioral.
- If 10 old lines are replaced by 1 equivalent line, the stat shows `-10 +1`.
- If code moves to new files with formatting compaction (one-line callbacks, combined declarations), total `-` can exceed total `+` without functional loss.

## What was moved
- `Game.ts` became an entrypoint re-export:
  - `rgfn_game/js/Game.ts`
- Runtime orchestration moved to:
  - `rgfn_game/js/game/GameFacade.ts`
- Construction/wiring moved to:
  - `rgfn_game/js/game/GameFactory.ts`
- Quest behavior moved to:
  - `rgfn_game/js/game/runtime/GameQuestRuntime.ts`
- Persistence behavior moved to:
  - `rgfn_game/js/game/runtime/GamePersistenceRuntime.ts`
- World interaction behavior moved to:
  - `rgfn_game/js/game/runtime/GameWorldInteractionRuntime.ts`

## Method coverage check (old Game.ts vs new modules)
Old `Game.ts` methods that disappeared as names but are accounted for by relocation/consolidation:
- `initializeQuestUi` -> `GameQuestRuntime.initialize`
- `recordLocationEntry` -> `GameQuestRuntime.recordLocationEntry`
- `recordBarterCompletion` -> `GameQuestRuntime.recordBarterCompletion`
- `recordMonsterKill` -> `GameQuestRuntime.recordMonsterKill`
- `tryCreateQuestMonsterEncounter` -> `GameQuestRuntime.tryCreateQuestMonsterEncounter`
- `collectBarterContracts`/`registerQuestLocations` -> internal helpers in `GameQuestRuntime`
- `saveGameIfChanged`/`loadGame`/`getParsedSaveState` -> `GamePersistenceRuntime`
- canvas/world-map handlers -> `GameWorldInteractionRuntime`
- state machine + event binding setup -> `GameFactory`

Methods removed as separate helpers because they were redundant/unused after extraction:
- `handleWorldMapPan`
- `handleWorldMapZoom`
- `stopWorldMapMiddleDrag`
- `positionWorldVillageEntryPrompt`

## LOC check for rule 3
All touched/new files are `< 200` LOC:
- `rgfn_game/js/Game.ts`: 1
- `rgfn_game/js/game/GameFacade.ts`: 111
- `rgfn_game/js/game/GameFactory.ts`: 80
- `rgfn_game/js/game/runtime/GameQuestRuntime.ts`: 121
- `rgfn_game/js/game/runtime/GamePersistenceRuntime.ts`: 54
- `rgfn_game/js/game/runtime/GameWorldInteractionRuntime.ts`: 133

## Verification commands and results
- `npm run build:rgfn` -> PASS
- `node --test rgfn_game/test/systems/gameBattleCoordinator.test.js rgfn_game/test/systems/worldModeController.test.js rgfn_game/test/systems/questUiController.test.js` -> PASS
- `npm test` -> FAIL (existing unrelated suite issues in repo-wide tests, including EVA dist imports and legacy TD tests)

## Practical conclusion
The `+518 / -721` delta is explained by file split + compaction and does **not** by itself imply lost functionality. The refactor keeps behavior by moving logic into focused runtime classes and passing focused subsystem tests.
