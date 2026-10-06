# Lint warning fixes (March 30, 2026)

## Scope addressed
This pass resolves the explicit warning set reported for:
- `js/game/GameFacade.ts`
- `js/game/GameFactory.ts`
- `js/game/runtime/GamePersistenceRuntime.ts`
- `js/game/runtime/GameQuestRuntime.ts`
- `js/systems/village/VillageLifeRenderer.ts`
- `js/systems/village/VillagePopulation.ts`

## What was changed
- Removed an unused `QuestNode` import in `GameFacade.ts`.
- Reformatted long one-line methods/signatures into multi-line blocks where needed for `max-len` compliance.
- Converted single-return methods flagged by `style-guide/arrow-function-style` to arrow-property style in village renderer/population modules and one quest-encounter accessor in `GameFacade.ts`.
- Broke up large object literals and callback bundles in `GameFactory.ts` so line lengths remain within limits.
- Updated specific signatures/initializers to satisfy `style-guide/rule17-comma-layout` where the rule requested compact one-line formatting.

## Verification commands
- `npx eslint rgfn_game/js/game/GameFacade.ts rgfn_game/js/game/GameFactory.ts rgfn_game/js/game/runtime/GamePersistenceRuntime.ts rgfn_game/js/game/runtime/GameQuestRuntime.ts rgfn_game/js/systems/village/VillageLifeRenderer.ts rgfn_game/js/systems/village/VillagePopulation.ts`
  - Result: no warnings in the targeted files.

## Notes for future fixes
- Running repo-wide `npm run lint:ts:rgfn:eslint` still reports warnings in many unrelated files (for example in `WorldMap.ts`, `GridMap.ts`, and others). Those were out of scope for this targeted warning batch.
- Running root `npm test` currently fails in this environment mainly because many tests import built artifacts from `dist/` paths that are not present yet, plus a subset of existing gameplay tests fail independently.

## Additional targeted max-len follow-up (March 30, 2026)
- Addressed four remaining `max-len` warnings reported in:
  - `js/systems/world/WorldMap.ts` (lines around 565, 1175, 1409 in the prior lint report)
  - `js/utils/GridMap.ts` (line around 134 in the prior lint report)
- Refactor pattern used: convert dense single-line arrow methods/object returns into multiline arrow expressions with trailing commas.
- No behavior changes were introduced; this was a formatting-only compliance pass.

### Command used
- `npx eslint rgfn_game/js/systems/world/WorldMap.ts rgfn_game/js/utils/GridMap.ts`
  - Result: no warnings.
