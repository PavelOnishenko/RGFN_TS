# GameFacade Rule 3 Refactor (2026-03-30)

## Why
`rgfn_game/js/game/GameFacade.ts` was 329 LOC and violated Style Guide Rule 3 (file < 200 LOC).

## What changed
- Split lifecycle/render/persistence responsibilities into `GameFacadeLifecycleCoordinator`.
- Split world-map interaction forwarding into `GameFacadeWorldInteractionCoordinator`.
- Added `GameFacadeSharedTypes` so both coordinators can safely access shared facade state through a typed contract.
- Kept `GameFacade` as the orchestration entry point, constructor wiring, runtime assignment, and public API surface.

## LOC outcome
- `GameFacade.ts`: 149 lines
- `GameFacadeLifecycleCoordinator.ts`: 149 lines
- `GameFacadeWorldInteractionCoordinator.ts`: 85 lines
- `GameFacadeSharedTypes.ts`: 37 lines

All touched files now satisfy Rule 3.

## Design notes and tradeoffs
- Runtime initialization side effects (`loadGame`, initial save sync, world centering for first run) were moved from constructor-time flow into `initializeAfterRuntimeAssignment()`. This keeps ordering explicit and avoids using unassigned runtime dependencies.
- Existing public GameFacade methods remain callable with the same signatures, so downstream callers do not need updates.
- `onVillageEntered` still accepts previous parameters for compatibility, but delegates to lifecycle coordinator state.

## Verification runbook
1. `npm run build:rgfn`
2. `npm run style-guide:audit:rgfn`
3. `npm test` *(known repo-wide failures unrelated to this refactor still present; see output for missing dist artifacts and existing projectile/wave assertions).* 

## Follow-up opportunities
- Continue Rule 3 backlog in `GameFactory.ts`, `HudController.ts`, and `WorldModeController.ts` (currently still over 200 LOC).
- Consider a focused test script for `rgfn_game` that builds dist artifacts before running Node tests, reducing noisy unrelated failures.
