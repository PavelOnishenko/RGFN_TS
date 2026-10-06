# World map visual naturalization pass (March 2026)

## Goal
- Remove bright/yellow seam artifacts visible between world-map cells at some zoom levels.
- Reduce "board game" decorative feeling and move map rendering closer to a continuous top-down 2D landscape.

## What changed

### 1) Grid overlay disabled in world-map draw pass
- `WorldMap.draw()` now forces `drawGrid = false`.
- This removes explicit cell-border strokes in all detail levels.

### 2) Terrain fill switched to full-cell rectangular paths
- `WorldMapRenderer.createTerrainPath()` now always returns a full-cell rectangle.
- Previous rounded insets + connectors + diagonal ribbons were removed from the render path.
- This avoids anti-aliased gaps/seams that became visible as thin bright lines on some zoom scales.

### 3) Unknown cells also fill full-cell path
- Unknown fog tiles now use the same full-cell rectangle path (instead of inset rounded rectangles), keeping edge behavior consistent.

### 4) Texture patterns made less geometric
- Grass/line/cross terrain texture helpers were changed from strict grids/crosses to deterministic irregular micro-strokes and scatter using cell coordinates as a stable seed.
- Texture alpha was reduced slightly to keep the terrain less decorative.

### 5) Theme safety net
- `theme.worldMap.gridLines` alpha set to `0` as an additional safeguard in case grid rendering is re-enabled later.

## Why this should remove yellow stripes
- The artifact could come from two sources:
  1. Explicit grid line rendering.
  2. Sub-pixel anti-alias seams between rounded/inset cell shapes when zoom scales produce non-integer screen edges.
- The new approach removes both classes by:
  - not drawing grid lines,
  - filling terrain as exact full-cell rectangles.

## Manual verification checklist
1. Open world map and zoom in/out across full allowed range.
2. Pan diagonally and horizontally at multiple zoom levels.
3. Confirm there are no persistent bright/yellow lines between cells.
4. Confirm terrain still differentiates biome types (grass/forest/mountain/water/desert).
5. Confirm fog transitions (`unknown -> discovered -> hidden`) still render correctly.

## Notes for future iterations
- If map looks too uniform after seam fix, add larger-scale blended overlays (macro noise / biome gradients) instead of per-cell border decoration.
- If needed, expose a config toggle for optional subtle grid lines for debug mode only.
