# Village panel reachability regression fix (April 12, 2026)

## Incident summary
- Players could enter a village and see the village title panel, but the interactive controls (`#village-actions`, `#village-rumors-section`) were effectively lost off-screen.
- In this state, core progression actions (NPC rumors, leave village, village services) became unreachable and the run was soft-locked.

## Root cause
- HUD panel layout persistence stores manual drag offsets for all draggable panels, including village-only panels.
- Previously saved offsets were restored without viewport safety checks.
- If the user changed resolution/zoom/window size (or had stale extreme offsets), restored panel coordinates could place the entire panel outside the visible canvas area.

## Code fix
- `GameUiHudPanelController` now applies a viewport reachability guard whenever:
  1. A panel is dragged.
  2. A stored panel layout is restored.
  3. A panel is reset to spawn.
- The guard ensures at least a minimal visible area remains inside the viewport and nudges the panel back if it is fully outside horizontal/vertical bounds.
- Village runtime now treats **`#village-actions` and `#village-rumors-section` as primary panels** and does not rely on the old `#village-sidebar` shell for player interactions.
- The previous empty `#village-sidebar` visual container remains hidden and no longer serves as an interactive panel.
- Entering village mode now force-shows both required panels and leaving village/battle/world mode force-hides both panels, so mode transitions cannot strand controls in a hidden state.

## Regression test coverage
- Added scenario test that preloads world layout storage with extreme negative offsets for `villageActions` and verifies bind/restore nudges the panel back toward visible coordinates.
- Added scenario test that preloads hidden state for village panels and verifies Village mode force-enables both panels.
- Added village actions controller test verifying entry shows both village panels and exit hides both.
- Existing layout persistence tests continue to validate context-specific layout storage and hidden-state behavior.

## Lessons learned / prevention checklist
1. **Persisted UI coordinates must be treated as untrusted input**.
   - Always clamp/normalize restored values against current viewport constraints.
2. **Village and battle action panels are gameplay-critical controls**.
   - New draggable gameplay panels must include a reachability invariant: "cannot be fully off-screen after restore".
3. **Regression tests should encode player-impacting failures**.
   - For every soft-lock UX defect, add a deterministic test fixture with stored state reproduction.
4. **When introducing draggable overlays, verify these three transitions**:
   - world -> village
   - battle -> world
   - resolution/window-size changes followed by reload
5. **Do not route critical village interactions through decorative wrappers**.
   - A visual shell panel with no actions can become a false-positive \"village UI is present\" signal; critical controls must be direct mode-owned panels.

## Follow-up ideas
- Add optional `Reset HUD layout` action in menu to clear persisted layout keys.
- Add telemetry/dev warning when a restored panel requires a large corrective nudge (useful for detecting future regressions early).
