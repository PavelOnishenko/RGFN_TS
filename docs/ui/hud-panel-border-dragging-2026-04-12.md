# HUD panel border dragging usability update (April 12, 2026)

## Problem statement

- HUD panels were only draggable from the title drag handle area.
- If a panel was restored or moved so that the title area was out of view, players could hit a dead-end state where:
  - the panel remained open,
  - the close button was unreachable,
  - and the panel could not be moved back into view.

## Behavior change

- Panels now support drag start from **all four panel borders** (top/right/bottom/left) in addition to the existing title handle.
- This adds a rescue interaction for partially off-screen windows while keeping the familiar title-bar drag model.

## Resize precedence rule

- Bottom-right resize behavior must not regress.
- A dedicated bottom-right corner zone is treated as resize-priority and excluded from border-drag initiation.
- Result: users can still resize via the corner as before; border drag applies elsewhere on the edges.

## Implementation notes

- `GameUiHudPanelController` now:
  - centralizes drag lifecycle in a shared `startPanelDrag(...)` routine,
  - evaluates border-hit geometry in `shouldStartBorderDrag(...)`,
  - ignores non-left-click interactions,
  - skips drag start when interaction lands inside the resize-priority corner,
  - keeps existing panel reachability + persistence behavior untouched.

## Regression coverage added

- Added scenario coverage that confirms:
  1. a panel can be moved by initiating pointer drag from a border area,
  2. pointer down in the bottom-right resize corner does not bind drag movement listeners (resize priority preserved).

## Why this matters

- This avoids "panel stranded off-screen" UX traps.
- It reduces recovery friction on dynamic viewport changes, zoom/resolution changes, and stale saved offsets.
- It preserves desktop resize ergonomics while improving overall panel robustness.
