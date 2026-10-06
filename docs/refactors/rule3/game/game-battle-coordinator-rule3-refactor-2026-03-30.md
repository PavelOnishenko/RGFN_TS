# GameBattleCoordinator Rule 3 refactor (2026-03-30)

## Why this was done
- Requested target: `rgfn_game/js/systems/game/runtime/GameBattleCoordinator.ts`.
- Style Guide Rule 3 requires each file to stay below 200 LOC.
- The file was 224 LOC before this refactor and exceeded the limit.

## What changed
- Extracted battle lifecycle and transition state into a dedicated class:
  - New file: `rgfn_game/js/systems/game/runtime/GameBattleRuntimeFlow.ts`.
- Kept `GameBattleCoordinator` focused on orchestration and command forwarding.
- Moved these responsibilities from coordinator into runtime flow:
  - Enter battle mode UI + setup staging.
  - Battle start setup (`battleMap.setup`, turn initialization, encounter log/HUD update).
  - Battle end resolution (`victory`, `defeat`, `fled`) and transitions.
  - Transition flag state and battle-session enemy/terrain state.

## Resulting file sizes
- `GameBattleCoordinator.ts`: 173 LOC.
- `GameBattleRuntimeFlow.ts`: 107 LOC.
- Both files now satisfy Rule 3 (`< 200 LOC`).

## Validation run
- `npm run build:rgfn` ✅ passed.
- `npm run style-guide:audit:rgfn` ✅ ran successfully (informational backlog remains outside this task).
- `npm test` ❌ fails in this repository baseline for unrelated suites:
  - Missing `dist` module imports in multiple `eva_game` and `rgfn_game` tests.
  - Existing unrelated failing assertions in `test/game/waveManagement.test.js` and `test/projectiles.test.js`.

## Notes for future refactors
- The runtime folder now has one more focused class that can be reused as a pattern for other rule-3 reductions.
- The style-guide audit still lists `js/systems/game` folder as over child-limit (rule 16); future extractions in this area should prefer consolidating related runtime helpers when practical.
