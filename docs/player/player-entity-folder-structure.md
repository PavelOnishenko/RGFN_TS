# Player Entity Folder Structure (March 29, 2026)

## Why this refactor was made

The `rgfn_game/js/entities/player` directory exceeded the preferred flat-file size.
To keep each folder under 10 children and improve navigation, player files were grouped
by responsibility.

## New structure

- `rgfn_game/js/entities/player/Player.ts` (public player entry point used by systems)
- `rgfn_game/js/entities/player/core/`
  - `PlayerBase.ts`
  - `PlayerRenderer.ts`
  - `PlayerCombatState.ts`
  - `PlayerProgression.ts`
  - `PlayerInventoryAndRender.ts`
  - `PlayerPersistence.ts`
- `rgfn_game/js/entities/player/inventory/`
  - `PlayerInventory.ts`
  - `PlayerInventoryEquipment.ts`
  - `PlayerInventoryTypes.ts`
- `rgfn_game/js/entities/player/shared/`
  - `PlayerTypes.ts`

## Import path rules after move

- Keep external imports pointing to `entities/player/Player.js` where possible.
- Internal files in `core/` now use:
  - `../inventory/...` for inventory modules
  - `../shared/...` for shared player types
  - `../../Item.js` for `entities/Item.js`
  - `../../../config/...` and `../../../systems/...` for game config/systems
- Internal files in `inventory/` now use `../../Item.js` for item dependencies.

## Validation checklist used

1. Build the RGFN TypeScript project:

   ```bash
   npm run build:rgfn
   ```

2. Run full repository tests to detect unrelated baseline failures:

   ```bash
   npm test
   ```

## Known baseline test issues observed while validating

- The root `npm test` run fails in this repository due to pre-existing test-suite/setup issues,
  including missing prebuilt `dist` modules in `eva_game` and `rgfn_game`, plus several
  projectile tests expecting `enemy.takeDamage` in root game tests.
- These failures were observed during this change and are not introduced by this folder refactor.

