# Selected Panel on Battle Map

## What is implemented
- The `Selected` HUD panel now works in **both** world-map mode and battle mode.
- In battle mode, moving the mouse over the arena now:
  - highlights the hovered tile,
  - updates the `Selected` panel with tile information.

## Battle tile data shown in Selected panel
For each hovered battle tile, the panel now reports:
- Coordinates (`col, row`),
- Base terrain type (`grass`, `forest`, `mountain`, `water`, `desert`),
- Obstacle name if present (for example: `Rock`, `Tree`, `Cactus`),
- Traversability (`Walkable` / `Blocked`),
- Occupant class (`Player`, `Enemy`, or `None`),
- Occupant display name,
- Occupant HP as `current/max` when available.

## Technical notes
- A new type union was introduced:
  - `SelectedWorldCellInfo` (world map),
  - `SelectedBattleCellInfo` (battle map),
  - `SelectedCellInfo` (common HUD input).
- `BattleMap` now tracks hovered cell with `selectedGridPos` and exposes:
  - `updateSelectedCellFromPixel(...)`,
  - `clearSelectedCell()`,
  - `getSelectedCellInfo()`.
- `BattleMapView` now receives the hovered battle cell and draws:
  - a soft fill highlight,
  - a border highlight.
- `Game.handleCanvasMove` / `Game.handleCanvasLeave` now route hover handling by mode (`WORLD_MAP` vs `BATTLE`).

## Why this matters
This makes the `Selected` panel consistent across tactical layers:
- same user workflow on world map and battle map,
- faster decision-making from immediate tile/entity context,
- easier debugging/QA because hover data is visible in real time.
