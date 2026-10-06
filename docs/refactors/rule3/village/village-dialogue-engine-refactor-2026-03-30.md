# VillageDialogueEngine refactor notes (2026-03-30)

## Why this change was made
- Applied Style Guide Rule 3 (`Files not longer than 200 lines`) to `rgfn_game/js/systems/village/VillageDialogueEngine.ts`.
- Original file length was **210 LOC**, so direction/math and NPC roster generation logic were extracted into dedicated helper classes.

## What was extracted
- New file: `rgfn_game/js/systems/village/VillageDialogueSupport.ts`
  - `VillageDirectionService`
    - Random direction selection
    - Opposite direction mapping
    - Nearby direction approximation
    - Humanized distance labels (`distanceText`, `impreciseDistance`)
  - `VillageNpcFactory`
    - NPC roster generation
    - NPC profile randomization via `pick<T>()`

## Resulting structure
- `VillageDialogueEngine.ts` now focuses on dialogue outcomes and disposition-based branching.
- `VillageDialogueSupport.ts` centralizes reusable, deterministic helper behavior.

## Current LOC status
- `VillageDialogueEngine.ts`: **184 LOC**
- `VillageDialogueSupport.ts`: **77 LOC**

## Validation performed
- `npm run build:rgfn` passed.
- `npm run lint:ts:rgfn:eslint` passed with warnings only (no new errors introduced by this refactor).
- `npm test` currently fails in this repository due to unrelated baseline issues (missing `dist` modules and pre-existing failing projectile/wave tests).

## Follow-up ideas
- If needed, split dialogue response builders further by topic:
  - `VillageLocationDialogueComposer`
  - `PersonLocationDialogueComposer`
- Consider moving shared dialogue-related types into a dedicated `VillageDialogueTypes.ts` if additional dialogue classes are added.
