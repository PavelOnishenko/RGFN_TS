# Monster shared entity refactor notes (March 29, 2026)

## Context and architecture intent
- `Skeleton.ts` is currently the runtime entity used for multiple enemy archetypes (`Skeleton`, `Zombie`, `Ninja`, `Dark Knight`, `Dragon`).
- The old helper names (`Skeleton*`) implied specialization to skeleton-only behavior, while most extracted logic was actually cross-monster logic.
- This pass renames those helpers to monster-generic names and keeps concerns split by responsibility.

## Naming corrections performed
- `SkeletonStatusEffects` → `MonsterStatusEffects`
- `SkeletonMutationEngine` → `MonsterMutationEngine`
- `SkeletonVisualRenderer` → `MonsterVisualRenderer`
- import paths moved from `js/entities/skeleton/*` to `js/entities/monster/*`.

## Architectural improvements in this pass
- `MonsterMutationEngine` no longer depends on the concrete `Skeleton` class.
  - It now accepts a focused `MonsterMutationTarget` interface to avoid hard-coupling mutation logic to one entity class.
  - This makes mutation logic reusable for future monster entities without type-level circular dependencies.
- `MonsterVisualRenderer` uses a renderer registry (`drawByName`) for named monster visuals.
  - This keeps adding a new monster style as a data registration concern, not a growing conditional chain.

## Why this structure is useful going forward
- `Skeleton.ts` can remain a compatibility façade while architecture evolves.
- If a true base monster class is introduced later, `MonsterStatusEffects`, `MonsterMutationEngine`, and `MonsterVisualRenderer` are already named and shaped for reuse.
- This minimizes churn when splitting `Skeleton.ts` into `MonsterEntity.ts` + archetype wrappers in a later step.

## Validation runbook for this area
1. Build TypeScript for `rgfn_game`.
2. Run tests (note: current repo has known baseline test setup failures unrelated to this refactor).
3. Verify all touched files remain below 200 LOC.
4. Verify combat log strings remain unchanged for mutation/status events.

## Potential next refactors
- Introduce `MonsterEntity` as a clearer name than `Skeleton` for shared combatant logic.
- Move per-archetype drawing registration into configuration data (instead of hardcoded constructor map) when asset strategy is clarified.
- Revisit `initDamageable` type declaration to remove the cast once base mixin typings are unified.
