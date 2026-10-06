# BattleMapView Refactor Notes

## Why this refactor was needed
- `BattleMapView.ts` exceeded style guide rule 3 (`< 200` LOC per file).
- Rendering logic mixed tile painting, obstacle painting, geometry helpers, and color math in one class.

## New class layout
- `BattleMapView.ts`: orchestration of per-cell drawing and highlights.
- `BattleTerrainPainter.ts`: terrain palette selection and terrain texture detail drawing.
- `BattleObstaclePainter.ts`: obstacle rendering split into focused methods per obstacle kind.
- `BattleMapPainterUtils.ts`: reusable rounded-rectangle path and color utility helpers.

## Practical guidance for future changes
- Add new terrain visual variants in `BattleTerrainPainter` (`draw*Detail` + `getTerrainPalette`).
- Add new obstacle kinds in `BattleObstaclePainter` by extending `BattleObstacleKind` and implementing a dedicated `draw*` method.
- Keep shared visual primitives in `BattleMapPainterUtils` to avoid duplication across renderers.
- If a file approaches ~170 lines, prefer extracting cohesive rendering behavior into another class early.
