# QuestPackService Rule 3 Refactor (2026-03-30)

## Goal
Apply style guide rule 3 (`Files not longer than 200 lines`) to `QuestPackService.ts` while preserving behavior.

## What changed
- Split shared quest-pack constants/types into `QuestPackTypes.ts`.
- Extracted word-target weighting and weighted roll logic into `QuestNameWordTargetSelector`.
- Extracted source-creation and remote/local pack generation logic into `QuestPackSourceFactory`.
- Kept orchestration responsibilities in `QuestPackService`:
  - initialization
  - source probing/availability
  - high-level name generation flow

## LOC status
- `QuestPackService.ts`: 141 lines.
- `QuestPackSourceFactory.ts`: 71 lines.
- `QuestNameWordTargetSelector.ts`: 41 lines.
- `QuestPackTypes.ts`: 36 lines.

All new/updated files are below 200 LOC.

## Behavior-preservation notes
- Location names still prioritize map-village source when available.
- Weighted word-target selection still reads from `theme.quest.nameGeneration.wordLengthWeightsByDomain`.
- Remote location/name sources still use:
  - `https://restcountries.com/v3.1/all?fields=name,capital,region,subregion`
  - `https://randomuser.me/api/?inc=name&noinfo&results=1`
- Fallbacks and probing logic remain unchanged.

## Validation run
- `npm run build:rgfn` passes.
- `npm test` currently fails in repository baseline due to missing `dist` artifacts and unrelated failing tests.

## Reuse guidance
For future rule-3 refactors of large services:
1. Isolate constants/types first.
2. Extract deterministic logic (selectors/transformers) next.
3. Extract external I/O branches last (factories/adapters).
4. Keep original service as a coordinator to limit regression risk.
