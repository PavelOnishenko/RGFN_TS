# Player TODO Resolution Knowledge Base

## What Was Actually Done

The TODO requiring strict extraction was completed by splitting the original monolithic `Player.ts` into a layered class hierarchy where **every resulting file is under 200 lines**:

- `rgfn_game/js/entities/Player.ts` (5 lines, public entrypoint only)
- `rgfn_game/js/entities/player/PlayerBase.ts` (core construction + damage + stat derivation)
- `rgfn_game/js/entities/player/PlayerProgression.ts` (XP, level-up, stat spending)
- `rgfn_game/js/entities/player/PlayerCombatState.ts` (rage, directional combat buffs, fatigue)
- `rgfn_game/js/entities/player/PlayerInventoryAndRender.ts` (inventory API surface + formulas + draw)
- `rgfn_game/js/entities/player/PlayerPersistence.ts` (save/restore state)
- `rgfn_game/js/entities/player/PlayerTypes.ts` (shared type/constants)

## Why This Shape Works

The hierarchy separates responsibilities by domain while preserving the original `Player` API for callers:

1. **Construction and base formulas** stay in `PlayerBase`.
2. **Character progression** is isolated from combat state transitions.
3. **Combat-turn statuses** are isolated from inventory and UI-facing methods.
4. **Inventory façade + rendering helpers** remain separate from persistence concerns.
5. **Persistence logic** can evolve without contaminating real-time combat code.

This keeps each source file short, readable, and easier to test independently.

## Style-Guide Compliance Notes

During refactor, the main style-guide pressure points were:

- avoid giant methods by extracting cohesive helpers/classes
- keep branch formatting lint-compliant (curly braces where required)
- preserve existing public API behavior while reshaping internals
- keep file lengths constrained and auditable (`wc -l` check)

## Practical Repeatable Workflow (for future large TODOs)

1. Freeze public API signatures first.
2. Group methods by behavior domain (construction, combat, progression, persistence, UI/inventory).
3. Extract one domain at a time into an inherited layer or collaborator.
4. Re-run TypeScript build after each extraction wave.
5. Re-run lint and fix style-guide violations immediately.
6. Verify file length budgets at the end with `wc -l`.

## Checks Run for This Refactor

- `npm run build:rgfn` (passes after extraction)
- `npm run lint:ts:rgfn:eslint -- rgfn_game/js/entities/Player.ts rgfn_game/js/entities/player` (no new lint errors in changed files; one pre-existing warning remains in `rgfn_game/js/entities/Item.ts`)
- `npm test` (fails due to existing repository baseline issues unrelated to this refactor: missing dist-module test imports and known unrelated failing tests)

## Useful Follow-up Opportunities

- Add focused tests for each extracted layer:
  - `PlayerProgression`: XP overflow + level cap + intelligence magic-point gains
  - `PlayerCombatState`: directional bonus consume/expire behavior
  - `PlayerPersistence`: numeric coercion + inventory restoration compatibility
- Consider replacing inheritance with composed domain services later if runtime construction constraints allow.

## 2026-03-29: PlayerInventory TODO Sweep

The TODO backlog in `rgfn_game/js/entities/player/PlayerInventory.ts` was fully cleared with behavior-preserving refactors:

- Converted simple getter/query utilities to class-field arrow functions to align method style consistently.
- Replaced inline equipment-clearing logic in `removeItemAt` with `clearRemovedItemFromEquipment` to keep mutating responsibilities isolated and reduce repeated hook triggers.
- Split `equipWeaponToSlot` branch-heavy logic into:
  - `equipTwoHandedWeapon`
  - `equipOneHandedWeapon`
  This keeps each helper focused and makes slot rules easier to test.
- Introduced explicit `InventoryState` and `RestoreInventoryStateArgs` types to remove long inline object signatures and improve API readability.
- Updated `restoreState` to use a named object argument (instead of a long positional parameter list), which also makes call sites less error-prone.
- Updated `PlayerPersistence.restoreState` to call the new object-form inventory restore API.

### Why This Matters

- Fewer long methods reduce regression risk when changing equip logic.
- Named restore arguments prevent ordering bugs in save/load code.
- Isolated helpers make it easier to add unit tests around two-handed/offhand edge cases.

## 2026-03-29 (Follow-up): Hard Line-Budget Compliance for Inventory Classes

After review feedback, the inventory TODO was enforced literally: **no class in the extracted inventory flow remains above 200 lines**.

- `PlayerInventory.ts` now acts as a compact orchestration layer (190 lines).
- Equipment-specific state transitions were moved into `PlayerInventoryEquipment.ts` (139 lines).
- Shared inventory contracts were moved into `PlayerInventoryTypes.ts` for cleaner dependency boundaries.

### Practical lessons captured

1. If a TODO says “extract to new classes”, partial in-place cleanup is not enough—line budget must be satisfied directly.
2. Stateful domains (equipment vs. bag storage) split cleanly when one class owns equip/unequip semantics and another owns inventory capacity + item collection.
3. Using object-shaped restore arguments plus dedicated type modules keeps save/load changes safer across refactors.
