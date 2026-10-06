# VillagePopulation Rule 3 Refactor (2026-03-30)

## Goal
Apply style guide rule 3 (file length under 200 LOC) to `VillagePopulation.ts` by extracting cohesive behavior into new classes while preserving runtime behavior.

## What was extracted

### 1) `VillageVillagerFactory`
- Owns villager creation and randomized visual/activity generation.
- Keeps all color palette decisions in one place.
- Provides:
  - `createVillager(spots, now)`
  - `pickActivity()`
  - `pickDifferentSpot(current, spotsLength)`

### 2) `VillageVillagerMotion`
- Owns movement, pause logic, interpolation, and snapshot alignment.
- Provides:
  - `updateVillager(...)`
  - `alignVillagerToSpots(...)`

### 3) `VillagePopulation` after extraction
- Now acts as coordinator only:
  - stores spots and snapshots,
  - initializes villagers from snapshot/factory,
  - delegates per-frame movement,
  - persists current village snapshot.

## Line-count outcome
- `VillagePopulation.ts`: **79 LOC**
- `VillageVillagerFactory.ts`: **73 LOC**
- `VillageVillagerMotion.ts`: **131 LOC**

All touched files are below 200 LOC.

## Why this split is useful
- Better separation of concerns for future tuning:
  - economy/appearance tuning can happen in factory,
  - pacing/movement tuning can happen in motion logic.
- Easier unit testing of movement decisions without spinning full population lifecycle.
- `VillagePopulation` becomes easier to read and maintain.

## Verification run notes
- `npm run build:rgfn` passes.
- `npm run style-guide:audit:rgfn` passes as an informational audit.
- `npm run test` currently fails due to existing repository-wide test environment/state issues (missing `dist` modules in multiple suites and unrelated failing assertions in legacy tests).

## Follow-up opportunities
- Add focused tests for `VillageVillagerMotion` interpolation and pause/travel transitions.
- Add deterministic RNG wrapper if future balancing needs reproducible village simulation.
