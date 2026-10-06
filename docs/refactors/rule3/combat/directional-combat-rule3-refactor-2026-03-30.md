# DirectionalCombat Rule 3 Refactor (2026-03-30)

## Goal
Apply style guide Rule 3 (`files < 200 LOC`) to `rgfn_game/js/systems/combat/DirectionalCombat.ts` by extracting cohesive combat-resolution logic into dedicated class(es) while preserving battle behavior.

## What changed
- Kept `DirectionalCombat.ts` as the public API/types surface for combat exchanges.
- Extracted exchange execution logic into new class `DirectionalCombatExchangeResolver`.
- Preserved function contract:
  - `resolveDirectionalCombatExchange(params)` still exists and now delegates to one shared resolver instance.
- Preserved semantics for:
  - attack-vs-attack lane resolution (same/adjacent/opposite),
  - block mitigation and block-advantage rewards,
  - dodge vulnerability and successful-dodge multiplier rewards,
  - combat log wording and ordering.

## Why this split
- `DirectionalCombat.ts` now focuses on **types + API entry points**.
- `DirectionalCombatExchangeResolver.ts` now focuses on **exchange orchestration and branch handling**.
- This improves local testability and future extensibility (for example, adding new directional stances without growing the API file).

## Rule 3 verification
- `rgfn_game/js/systems/combat/DirectionalCombat.ts`: **73 LOC**
- `rgfn_game/js/systems/combat/DirectionalCombatExchangeResolver.ts`: **197 LOC**

Both touched combat files are now under 200 LOC.

## Checks run
- `npm run build:rgfn` ✅
- `npm test` ⚠️ (repository-wide pre-existing failures unrelated to this change, mostly missing `dist` modules for eva/rgfn tests and existing unrelated assertions)

## Follow-up opportunities
- Add focused unit tests around `DirectionalCombatExchangeResolver` branch matrix (attack/block/dodge permutations) to lock behavior before future combat tuning.
- If Rule 16 folder-count enforcement is enabled in future tooling, consider introducing a combat submodule folder strategy to keep extraction capacity without violating immediate-child limits.
