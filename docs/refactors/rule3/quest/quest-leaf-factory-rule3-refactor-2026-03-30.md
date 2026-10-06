# QuestLeafFactory.ts Rule 3 Refactor (2026-03-30)

## Goal
Apply style guide Rule 3 (`files < 200 LOC`) to `rgfn_game/js/systems/quest/QuestLeafFactory.ts` by extracting cohesive responsibilities into dedicated class(es) while preserving quest generation behavior.

## What changed
- Extracted reusable leaf-node content composition logic into a new class:
  - `rgfn_game/js/systems/quest/QuestLeafContentBuilder.ts`
- Kept orchestration and objective-specific flow in:
  - `rgfn_game/js/systems/quest/QuestLeafFactory.ts`

### Extracted responsibilities
`QuestLeafContentBuilder` now owns:
- node assembly (`node`)
- quest text helpers (`label`, `pluralLabel`, `removeText`, `killText`)
- unique entity extraction (`entities`)
- random monster profile generation (`rareMonsterProfile`)
- random mutation picks (`randomMutatedSpecies`, `randomMutations`)

`QuestLeafFactory` now focuses on:
- objective type dispatch
- domain name generation via `QuestPackService`
- objective-specific data wiring (deliver, hunt, eliminate, etc.)

## Rule 3 verification
- `QuestLeafFactory.ts`: **191 LOC**
- `QuestLeafContentBuilder.ts`: **107 LOC**
- Both are below 200 LOC.

## Validation commands and results
- `npm run build:rgfn` ✅
- `node --test rgfn_game/test/systems/questGenerator.test.js rgfn_game/test/systems/questProgressTracker.test.js rgfn_game/test/systems/questUiController.test.js rgfn_game/test/systems/questPackService.test.js` ✅
- `npm run style-guide:audit:rgfn` ✅ (informational; still shows backlog in unrelated files)
- `npm test` ⚠️ (repository-wide baseline failures unrelated to this refactor; missing `dist` modules for several suites and pre-existing assertion failures in non-quest areas)

## Knowledge captured for future refactors
- If you extract helpers from quest factories, keeping random/semantic generation in a dedicated builder class minimizes churn in tests because call sites remain stable.
- Quest-targeted tests can be run directly with `node --test` on quest system test files to validate behavior quickly while broader repo baseline is unstable.
- Style audit is useful to confirm rule-3 scope regressions quickly, but should be interpreted as backlog signal, not a gate, unless CI policy changes.
