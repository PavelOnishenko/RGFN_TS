# Village selected-panel visibility rule (2026-04-12)

## Problem
- The HUD **Selected** panel (`#selected-panel`) stayed visible when the mode switched to **Village**.
- In village mode, selected-cell inspection is not meaningful because world/battle tile selection is inactive.
- This caused a persistent empty panel and unnecessary UI noise.

## Implemented behavior
- Entering **Village** mode now force-hides the **Selected** panel.
- Leaving village back to **World Map** restores the panel visibility to whatever it was before entering village:
  - if player had it open in world mode, it reopens;
  - if player had it hidden in world mode, it stays hidden.

## Persistence details
- World/battle panel layouts still persist separately.
- While in village mode, selected-panel persistence writes use the pre-village visibility snapshot, so temporary force-hide does not overwrite player preference.

## Main code touchpoint
- `rgfn_game/js/systems/game/ui/GameUiHudPanelController.ts`

## Regression coverage
- Scenario test:
  - `GameUiHudPanelController hides selected panel in Village mode and restores world visibility on return`
- File:
  - `rgfn_game/test/systems/scenarios/gameUiHudPanelController.test.js`
