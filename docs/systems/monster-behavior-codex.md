# Monster Behavior Codex (Directional Combat AI)

## Goals

This system is intentionally designed so players can gradually learn enemy patterns and gain tactical advantage.

- Every monster archetype has a generated behavior codex per world.
- Monsters execute behavior **sequences** (not isolated random actions every turn).
- Over time this makes enemy decisions readable and beatable.

## Hard Rules

1. **No fallback move logic.**
   - If a monster has no codex entry or gets an empty behavior pool, this is now treated as an error.
   - We do this deliberately so configuration gaps fail fast during development.
2. **Every monster archetype participates** (skeleton, zombie, ninja, darkKnight, dragon).
3. **Humans use per-entity behavior pools.**
   - Human combatants (`Wanderer`, defend quest combatants like hired blades/defenders, and recover-target humans) now receive directional pools at entity construction time.
   - The pool is generated from the human move list, but is instance-scoped instead of shared codex-scoped.
   - This prevents crashes where human entities reached directional combat without an assigned pool.
4. **Quest-spawned monsters and unique quest mutants use the same rolling model** when they are created in code.
5. Behavior length is configurable and currently set to **1..5 moves**.

## Configuration

Main settings:

- `rgfn_game/js/config/balance/progressionBalance.ts`
- path: `combatBalance.enemyBehaviorGeneration`

Current knobs:

- `minBehaviorsPerMonsterType`
- `maxBehaviorsPerMonsterType`
- `minMovesPerBehavior`
- `maxMovesPerBehavior`
- `behaviorWeightMin`
- `behaviorWeightMax`
- `monsterMovePools` (allowed directional moves per monster archetype)

## Runtime Flow

1. At runtime/world initialization, the game generates one codex for non-human monster archetypes.
2. Whenever a non-human monster instance is created, it receives the behavior pool matching its archetype.
3. Human entities generate their own behavior pool immediately on spawn using the same generation knobs and the human move pool.
4. In directional combat, enemy move resolution uses the monster's next move from its active behavior.
5. After a behavior finishes, the next behavior is selected with weighted random.

## Developer Lore Visibility

The Lore panel can show the generated codex (behavior IDs, weights, and move sequences) for each monster archetype, **but only while developer mode is enabled**.

- Developer mode ON: the extra "Monster behavior codex (DEV)" section is visible.
- Developer mode OFF: the section is hidden.

## Practical Tuning Advice

- If enemies feel too predictable, raise `maxBehaviorsPerMonsterType` and widen move pools.
- If enemies feel too chaotic, lower behavior counts and shorten max behavior length.
- If one pattern dominates too often, reduce that behavior's generated weight range or increase alternatives.

## Debug Checklist

If combat throws behavior-related errors:

1. Verify all archetype IDs used by monster spawns exist in `monsterMovePools`.
2. Verify each pool has at least one valid directional move token.
3. Confirm runtime world initialization is calling codex generation before encounters/quests.
4. Confirm human move pool (`human`) exists and is non-empty; human entities now initialize their own pool in `Skeleton`.
5. In developer mode, open Lore panel and inspect generated codex entries.
