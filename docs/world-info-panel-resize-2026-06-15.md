# World Info panel resize notes (2026-06-15)

## Context

The RGFN HUD window system decorates standard overlay panels in `GameUiHudPanelController` with a draggable header, close button, spawn positioning, and local-storage layout persistence. The World Info panel already participates in that TypeScript controller through the `worldInfo` panel configuration and uses the `rgfn_hud_panel_layout_*_v1` storage snapshots for width and height persistence.

## Fix summary

The World Info panel was missing from the CSS selector that grants regular HUD panels their resizable dimensions. As a result, it could be dragged and toggled like the other panels, but it did not expose the same `resize: both` behavior as the log, inventory, roster, village, world map, and combat panels on desktop.

`#world-info-panel` is now included in both relevant selector lists in `style.css`:

- Desktop HUD panel sizing/resizing: sets bounded width, min size, max viewport size, scrolling overflow, and `resize: both`.
- Narrow/mobile layout override: makes panels static and disables resizing (`resize: none`) to avoid awkward browser resize handles on constrained screens.

## Verification guidance

Useful checks for future changes:

1. Run `npm run build:rgfn` to catch TypeScript regressions in the RGFN game.
2. Run `npm run test:rgfn` for the RGFN node test suite.
3. Run `npm run lint:ts:rgfn` after touching TypeScript. For CSS-only changes this is still useful as a repository health check, but ESLint may report pre-existing TypeScript warnings unrelated to CSS.
4. Manual browser verification should open developer mode, click **World Info**, and confirm the panel can be resized from its bottom-right browser resize handle on desktop widths while remaining non-resizable under the `max-width: 900px` responsive layout.
