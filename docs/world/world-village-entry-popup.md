# World Map Village Entry Popup (RGFN)

## What changed

Village entry is now a **two-step flow on the global map**:

1. Walking onto a village tile no longer switches mode immediately.
2. A local popup appears on the world map **immediately when stepping onto the village tile**, near that tile, with two actions:
   - `Enter`
   - `Pass by`
3. `Enter` transitions to village mode directly (no second in-village Enter/Continue prompt).
4. `Pass by` closes the popup and keeps the player on world map.

This popup is non-blocking: while it is visible, world movement, panning, and normal world input still work.

## Runtime behavior details

- Popup is opened immediately when the move action lands on a village tile.
- `Space` / world panel `Enter Village` can still open it while already standing on the tile.
- Popup is also re-positioned if viewport/camera movement changes where the player cell appears on canvas.
- If the player leaves the village tile, the popup is closed immediately.
- If player tries to confirm after stepping off the tile, no transition is performed.
- Village mode now opens directly into village actions (`village-prompt` hidden by default in runtime flow for normal entry path).

## UI elements added

Inside `#world-map-shell`:

- `#world-village-entry-popup`
- `#world-village-entry-title`
- `#world-village-entry-enter-btn`
- `#world-village-entry-pass-btn`

## Implementation map

- Popup rendering + styling:
  - `rgfn_game/index.html`
  - `rgfn_game/style.css`
- UI wiring:
  - `rgfn_game/js/systems/game/GameUiTypes.ts`
  - `rgfn_game/js/systems/game/GameUiFactory.ts`
  - `rgfn_game/js/systems/game/GameUiEventBinder.ts`
- Core behavior and game-state integration:
  - `rgfn_game/js/systems/WorldModeController.ts`
  - `rgfn_game/js/Game.ts`
- Coverage updates:
  - `rgfn_game/test/systems/worldModeController.test.js`

## Why this design

- Keeps intent explicit: stepping onto a settlement no longer causes accidental mode switching.
- Preserves movement fluidity: popup is not modal and does not lock world controls.
- Maintains source of truth in world mode controller: prompt visibility is synchronized from current world state (`isPlayerOnVillage`).

## Quick manual verification checklist

1. Start on world map and move onto a village tile.
2. Confirm you stay in world mode (no forced transition).
3. As soon as you step onto that village tile, popup appears near the hero tile.
4. Press `Pass by` -> popup closes, still on world map.
5. Press `Space` while still on village tile -> popup appears again.
6. Press `Enter` -> village mode opens directly to village actions (no extra Enter/Continue choice).
7. Return to world map, open popup again, move off village tile -> popup closes immediately.

## Notes for future changes

- Positioning converts world-canvas coordinates into CSS viewport coordinates before clamping.
  - Runtime uses the canvas `getBoundingClientRect()` size to compute `scaleX/scaleY`.
  - Anchor point from world map (`getPlayerPixelPosition`) is multiplied by those scales.
  - Clamping is applied in viewport pixels, so popup placement stays stable across world-map zoom levels and stretched canvas layouts.
- If future design adds touch-first controls, reuse this popup for long-press village interactions.
- If village tiles ever become multi-cell settlements, replace the current `isPlayerOnVillage` close condition with tile identity matching.
