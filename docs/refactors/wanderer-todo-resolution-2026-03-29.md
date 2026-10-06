# Wanderer TODO resolution (2026-03-29)

## Scope
- Resolved all inline `todo` markers in `rgfn_game/js/entities/Wanderer.ts`.
- Kept runtime behavior equivalent while applying the requested code-shape cleanups (`arrow` conversions and ternary simplifications).

## What changed
1. Converted several instance methods to arrow-function class fields:
   - `canUseMagic`
   - `getMagicDamage`
   - `spendMana`
   - `getMagicManaCost`
   - `getAttackRange`
   - `getLootItems`
   - `getSkillRecord`
   - `canEquip` (private)
   - **Style rule applied:** when an arrow-function body is a single expression, use concise body syntax (`=> expr`) without braces/`return`.
     - Example: `public canUseMagic = (): boolean => this.magicPoints > 0 && this.mana >= this.getMagicManaCost();`
     - For `void` return methods that still fit single-expression form, use `void (...)` to keep concise syntax and explicit `void` type compatibility.

2. Simplified selection/control-flow methods using ternaries:
   - `rollLevel` now uses a single ternary return.
   - `pickBestWeapon` now returns via one ternary expression.
   - `pickBestArmor` now returns via one ternary expression.

## Why this is useful
- Arrow-function methods avoid accidental `this` rebinding bugs when methods are passed as callbacks.
- Single-expression ternary returns make short branch logic easier to scan during balancing/debug iterations.
- Removing stale TODO comments keeps technical debt visibility accurate (remaining TODOs should indicate real pending work).
- Standardizing concise arrow syntax removes formatting drift and speeds up code review for TODO-only refactors.

## Verification notes
- Build and test steps were run after the changes (see PR/testing summary).
