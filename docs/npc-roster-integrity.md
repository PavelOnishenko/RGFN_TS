# NPC Roster Integrity (RGFN)

## Problem solved
Quest givers and other village NPCs could disappear between visits because village rosters were generated ad-hoc and cached per village without a hard source-of-truth model.

## New model
`VillageNpcRoster` is now the source of truth for all generated and quest-injected NPCs in a world.

- NPC passport fields are stable: id, name, village, occupation, personality, speech style, visual look.
- Runtime fields are mutable: life status (`alive` / `dead`), source tag, first-seen / last-updated ticks.
- Every generated NPC is added to the roster immediately.
- Village UI always pulls villagers from `VillageNpcRoster`.
- New character/new world naturally starts with an empty roster because the game reloads and rebuilds runtime state.

## Integrity checks
`VillageActionsController` performs integrity checks during village entry, NPC UI refresh, and NPC selection.

- Missing expected NPC in a village raises `VillageRosterIntegrityError`.
- `VillageIntegrityAlert` shows a copy-friendly modal with:
  - short message
  - full message
  - stack trace

## Roster visibility (updated UX)
Roster inspection is now moved out of the regular Village Rumors panel into a dedicated HUD window:

- Panel name: **NPC Roster**
- Access path: **Hamburger menu (`☰`) → NPC Roster**
- Visibility: **Developer mode only** (persistent developer mode toggle)
- Filter: village dropdown (`All villages` + known villages)
- Entry data shown: name, occupation, village, personality, life status

### Why this UX change
- Keeps the player-facing rumors panel clean and focused on dialogue actions.
- Preserves fast dev/debug access without cluttering normal gameplay.
- Makes roster inspection consistent with other movable/toggleable HUD windows.

### Developer workflow notes
- If developer mode is disabled, the roster panel toggle is hidden.
- Existing roster data remains intact in runtime storage; only visibility is restricted.
- Re-enable developer mode to inspect the full source-of-truth roster again.
- The **NPC Roster panel is resizable** in desktop HUD mode (`resize: both`) so long passport entries can be inspected without scrolling each row.
- On small/mobile breakpoints (`max-width: 920px`), panel resize is intentionally disabled to keep layout stable.

### UI behavior details (for debugging)
- The roster panel uses the same draggable/decorated HUD window pipeline as other overlay panels (`GameUiHudPanelController`), including saved panel position/size between sessions.
- Roster panel visibility and active state are synchronized by `HudPanelStateController`; when developer mode is switched off, the panel is force-hidden.
- Village-side rendering still refreshes roster entries from `VillageNpcRoster`; the panel visibility flag does not mutate roster data.

## Dead NPC behavior
Defenders marked as fallen are no longer removed from the world roster; they stay in roster and are marked `[DEAD]`.
This avoids silent disappearance while preserving narrative state.
