# HudController.ts Rule 3 Refactor (2026-03-30)

## Why this change was needed

- Style guide Rule 3 requires files to remain below 200 LOC.
- `rgfn_game/js/systems/HudController.ts` was 710 LOC and mixed many unrelated concerns.
- The previous implementation bundled panel toggles, selected-cell projection, inventory/equipment drag-drop, spell presentation, and base stat rendering in one place.

## Refactor strategy

The refactor moved behavior into small, single-purpose classes while keeping `HudController` as an orchestrator/facade:

1. `HudSelectionInfoController`
   - Owns selected-cell panel rendering for both battle and world modes.
   - Keeps world-map formatting labels in one place.

2. `HudPanelStateController`
   - Owns panel toggle state and active toggle button synchronization.

3. `HudMagicController`
   - Owns spell level/detail rendering and battle spell button mana gating.

4. `HudInventoryController`
   - Owns inventory grid rendering, drag/drop tracking integration, and drop recovery behavior.

5. `HudInventoryItemMetadata`
   - Owns tooltip composition, requirement diagnostics, and weapon-damage preview at required stats.

6. `HudEquipmentController`
   - Owns equipment slot binding/rendering and equip/unequip/drop-to-slot flows.

7. `HudTypes`
   - Centralizes HUD element and callback types.

## Practical notes learned during this pass

- Passing narrow callbacks (`refreshHud`, `addLog`, drag index accessors) keeps helper classes decoupled from each other and from game runtime internals.
- Dedicated metadata/tooltip logic avoids growing the inventory renderer above rule-3 limits.
- Keeping DOM event listeners in feature-specific controllers makes future UI migration (e.g. split inventory tab) less risky.

## LOC outcome

- `HudController.ts`: 176 LOC.
- Every newly introduced HUD helper file is below 200 LOC.

## Suggested follow-ups

- Add focused unit tests for:
  - equipment drag-drop slot compatibility,
  - recovery behavior when inventory is full,
  - selected-cell battle/world label edge cases.
- Consider introducing a tiny shared HUD logger utility if additional controllers start needing richer log message formatting.
