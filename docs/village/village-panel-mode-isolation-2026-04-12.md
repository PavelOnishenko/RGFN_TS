# Village panel mode isolation hardening (April 12, 2026)

## Problem statement
- Some fresh runs could display **Village Actions** and **Village Rumors** while not actually in village mode (for example on the global map, and potentially during/after other mode transitions).
- These panels must be treated as **village-only HUD surfaces**.

## Root cause
`GameUiHudPanelController` persists draggable panel visibility in a shared "world layout" context used by both:
- `modeIndicator = "World Map"`
- `modeIndicator = "Village"`

That meant a previously saved village-panel visibility state could leak into World Map restore paths.

## Strict invariant introduced
Village-only panels (`#village-actions`, `#village-rumors-section`) now have a strict mode gate:
- **Village mode** (`modeIndicator === "Village"`): always visible.
- **Any non-village mode** (`"World Map"`, `"Battle!"`, or anything else): always hidden.

This is enforced in two places so persistence cannot bypass it:
1. During layout restore.
2. During layout persistence and mode-change enforcement.

## Implementation notes
Updated in `GameUiHudPanelController`:
- Added explicit `shouldForceVillagePanelsHidden()` companion to the existing village-visible predicate.
- `restoreLayoutForCurrentContext()` now force-hides village panels when not in Village mode, even if stored snapshot says `hidden: false`.
- `persistCurrentContextLayout()` now writes village panel hidden state as forced hidden outside Village mode.
- `enforceVillagePanelVisibility()` now performs both sides of the rule:
  - shows in Village mode
  - hides otherwise

## Regression tests
Added scenario tests in `rgfn_game/test/systems/scenarios/gameUiHudPanelController.test.js`:
1. **Mode transition hard gate test**
   - Start in Village mode, verify panels visible.
   - Switch to World Map, verify both hidden.
   - Switch to Battle, verify both remain hidden.
2. **Stale storage immunity test**
   - Seed `WORLD_KEY` with `villageActions.hidden = false` and `villageRumors.hidden = false`.
   - Bind controller in World Map mode.
   - Verify both panels are still hidden (stored visibility cannot leak).

## Why this is the strictest practical approach
- It does not rely only on transition order.
- It does not rely only on state machine callbacks.
- It guards against stale localStorage, panel dragging side effects, and mode text observer timing.
- It encodes rules in both restore and persistence paths plus runtime enforcement.

## Verification commands
- `npm run build:rgfn`
- `npm run test:rgfn`
- `npx eslint rgfn_game/js/systems/game/ui/GameUiHudPanelController.ts rgfn_game/test/systems/scenarios/gameUiHudPanelController.test.js`
