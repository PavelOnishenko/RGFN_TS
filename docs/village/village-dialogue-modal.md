# Village NPC Dialogue Modal Integration

## Goal

Move NPC conversations into a dedicated popup dialogue window (classic RPG style), while still reusing the same runtime dialogue log stream used in other game systems.

## What was changed

- Added a new modal window in `rgfn_game/index.html`:
  - `#village-dialogue-modal`
  - `#village-dialogue-log`
  - `#village-dialogue-selected-npc`
  - `#village-dialogue-close-btn`
- Kept NPC list selection in the village rumors block, but moved talk actions into the modal.
- Removed the extra open button from rumors section; NPC click now opens dialogue popup immediately.
- Integrated existing conversation controls into modal:
  - ask about location
  - ask about person
  - ask about barter
  - confirm barter
- Replaced free-text location/person fields with dropdowns:
  - `#village-ask-settlement-input` (`<select>`)
  - `#village-ask-person-input` (`<select>`)
  - This removes manual typing for repeated direction queries.

## Runtime behavior

- Player selects NPC from village rumors list.
- Dialogue popup opens immediately.
- The popup displays:
  1. selected NPC summary,
  2. dialogue log,
  3. response/action buttons.
- All newly generated dialogue lines are duplicated into:
  - global game log (`#game-log`), and
  - village dialogue modal log (`#village-dialogue-log`).
- Settlement dropdown is auto-filled from:
  - discovered villages from world map fog state,
  - named quest locations registered into world map metadata,
  - source/destination villages inferred from active barter/escort quest contracts **only when developer mode is enabled**.
- Person dropdown is auto-filled from:
  - active barter trader names tied to discovered villages (or all traders in developer mode),
  - active escort objective person names tied to discovered villages (or all escorts in developer mode),
  - NPCs already seen in village rumor rosters.

This keeps one shared source of dialogue events while showing NPC conversation in a focused modal.

## Controller-level details

`VillageActionsController` now:

- exposes `openDialogueWindow()` / `closeDialogueWindow()`;
- closes dialogue popup automatically when entering/leaving village;
- updates modal NPC caption in `updateNpcPanel()`;
- disables dialogue controls unless an NPC is selected;
- mirrors each `addLog(...)` line to both log containers.

## UI wiring

`GameUiFactory` and `GameUiTypes` were extended with modal fields for village UI.

`GameUiEventBinder` now binds:

- close dialogue button,
- backdrop click-to-close for dialogue modal,
- Escape key close for dialogue modal while it is open.

## Test coverage added

A new test validates:

- modal opens/closes via controller,
- dialogue line mirroring to both logs works.

File: `rgfn_game/test/systems/villageActionsController.test.js`.

## Known pitfall fixed (March 28, 2026)

- Symptom: after selecting an NPC from rumors list, `Open NPC dialogue window` stayed disabled.
- Root cause: `handleSelectNpc(...)` refreshed labels and NPC buttons but did not recalculate button enabled/disabled state.
- Fix: call `updateButtons()` inside `handleSelectNpc(...)` right after selecting NPC and rerendering.
- Regression guard: test now checks the button is disabled before selection and enabled immediately after selection.

## Known pitfall fixed (April 8, 2026)

- Symptom: fresh non-developer playthroughs showed very large settlement/person dropdowns in NPC dialogue, including undiscovered villages and quest names.
- Root cause: the dropdown aggregation merged all escort/barter contract data into selects regardless of map discovery and mode.
- Fix:
  - Non-developer mode now limits settlement options to `worldMap.getKnownSettlementNames()` output.
  - Non-developer mode now limits person options to:
    - already encountered NPC names in visible village rosters,
    - contract names whose source/destination village is already discovered.
  - Developer mode preserves full debug list behavior for both settlements and persons.
- Regression guards:
  - Added test that undiscovered `Farwatch`/`Cora` are hidden when developer mode is off.
  - Added test that they appear again when developer mode is enabled.

## Follow-up pitfall fixed (April 11, 2026)

- Symptom: location dropdown still showed many undiscovered names in non-developer mode even after contract gating fixes.
- Root cause: `worldMap.getKnownSettlementNames()` merged in `namedLocations` without checking tile discovery state.
- Fix: `WorldMapNamedLocationAndVillageOverlays.getKnownSettlementNames()` now includes named locations only when their anchor cell is discovered.
- Regression guard: `worldMap.test.js` now verifies undiscovered named location entries are excluded until discovered.

## Follow-up pitfall fixed (April 16, 2026)

- Symptom: NPC dialogue popup had no keyboard close path, forcing mouse interaction with close button or backdrop.
- Root cause: `GameUiPrimaryEventBinder` only wired click events for modal close and had no Escape handler.
- Fix:
  - Added a `keydown` listener in village UI binding flow.
  - Added `handleDialogueCloseHotkeys(...)` that closes the dialogue modal when `event.key === 'Escape'` and the modal is currently visible.
  - Added `preventDefault()` for that specific Escape close path to keep behavior deterministic while the popup is open.
- Regression guard:
  - Escape handling exits early when the modal is hidden, avoiding redundant close calls.
  - Existing world map keyboard zoom handling remains isolated in its own keydown branch.

## Follow-up pitfall fixed (April 16, 2026, layout/overflow)

- Symptom: when side-quest cards grew in count/height, the dialogue popup content could overflow beyond viewport bounds with inaccessible controls.
- Root cause: modal panel had fixed max-height but no own vertical scrolling, so inner sections could extend outside visible area.
- Fix:
  - `village-dialogue-panel` now uses `overflow-y: auto`, making the whole NPC dialogue panel scroll like other HUD/panel surfaces.
  - Side-quest offer cards now use a compact two-button row (`Accept quest` + `Refuse`) to reduce vertical pressure per card.
- Result:
  - all dialogue sections remain reachable,
  - modal behaves consistently with other scrollable panels under high-content scenarios.

## Notes for future extension

- If needed, next step is to render only NPC conversation lines in modal (filter by tags), while keeping full system log in main log panel.
- Optional follow-up: keyboard shortcut (e.g. `T` or `Enter`) to open dialogue modal when NPC selected.

## Follow-up pitfall fixed (April 19, 2026)

- Symptom: opening NPC dialogue required two clicks (`select NPC` -> `Open NPC dialogue window`).
- UX impact: extra redundant step in village rumors flow.
- Fix:
  - Removed `Open NPC dialogue window` button from village UI markup and UI models.
  - Removed binder wiring and presenter logic that toggled that button.
  - Updated `handleSelectNpc(...)` to open the dialogue modal immediately after selection.
- Regression guard:
  - Scenario test now verifies modal is hidden before selection and shown right after clicking NPC.

