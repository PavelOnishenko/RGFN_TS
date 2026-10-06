# World map performance notes (zoomed-out / small cell-size)


## Follow-up planning

- See `rgfn_game/docs/world-map-optimization-scientific-plan.md` for a structured, experiment-driven optimization workflow (baseline protocol, KPIs, staged rollout, and regression guardrails).

## March 2026 optimization pass

Context: when the world map is zoomed far out (small cell size, broad visible bounds), frame time was dominated by hot-path per-cell lookups.

### Changes implemented

1. Added O(1) array-backed caches in `WorldMap`:
   - `fogStatesByIndex`
   - `terrainByIndex`
   - `villageIndexSet`

2. Added a numeric index helper:
   - `getCellIndex(col, row) => row * columns + col`

3. Optimized draw-time access patterns:
   - draw loop now reads `GridMap.cells[index]` directly instead of repeated `getCellAt(col, row)` calls.
   - terrain/fog reads use index-based caches before falling back to string-key maps.

4. Optimized fog refresh flow:
   - transition `discovered -> hidden` now runs over index arrays (no per-cell key string construction in the hot loop).
   - map sync is kept after refresh for save compatibility.

5. Optimized village presence checks:
   - `isPlayerOnVillage` and selected-cell village checks use `villageIndexSet`.

6. Save/restore compatibility preserved:
   - restore now rebuilds index caches from serialized `fogStates` and `villages`.

## Why this is faster

- Avoids frequent string creation (`"col,row"`) during rendering-critical operations.
- Reduces Map/Set hash lookups in tight loops.
- Uses contiguous array access for terrain/fog state.
- Uses direct cell array indexing in the renderer path.

## Validation checklist

- Run:
  - `npm run build:rgfn`
  - `node --test rgfn_game/test/systems/worldMap.test.js`
- Manual smoke:
  - zoom all the way out,
  - pan in all directions,
  - toggle fog on/off in developer controls,
  - verify villages and selected-cell info still match behavior.

## Next-step ideas (if more speed is needed)

- Maintain fog only as an indexed array internally and generate serialized map form lazily only in `getState()`.
- Batch terrain rendering into chunked offscreen canvases and blit chunks at low detail.
- Introduce adaptive draw skipping for subpixel terrain textures when `cellSize <= 8`.

## March 2026 optimization pass #2 (actual frame-time impact)

The first pass reduced lookup overhead but still rendered every visible low-detail tile every frame.

### Additional change

- Added a **low-detail layer cache** for world-map rendering in `WorldMap`:
  - when detail level is `low`, we render the tile layer to an offscreen canvas once,
  - on following frames, we blit only the visible region via `drawImage`.

### Cache invalidation strategy

The low-detail cache is rebuilt when any of these change:
- `cellSize` (zoom changes),
- fog display config (`fogOfWar`, `everythingDiscovered`),
- `fogRevision` (visibility/discovery updates),
- `terrainRevision` (world/terrain regeneration).

### Why this matters

At low zoom, this removes thousands of per-frame canvas calls and style/state transitions from the main frame loop. Panning becomes primarily a cheap image blit + overlay draw instead of full per-cell repaint.

### Safety fallback

In non-browser/test contexts (no `document` or no `drawImage`), rendering falls back to the existing per-cell path to keep tests deterministic and environment-agnostic.

## March 2026 optimization pass #3 (medium-detail and fog-invalidation improvements)

### Problem observed after pass #2

- Low-detail caching improved panning throughput, but cache rebuild frequency was still tied to fog updates.
- Because `fogRevision` changes when player visibility updates, long sessions still did expensive low-detail terrain repaints.
- Medium detail still repainted full terrain every frame.

### Additional changes

1. Replaced single low-detail cache with terrain-layer caches for both:
   - `low`
   - `medium`
2. Cache now stores **terrain-only** layer:
   - `showFogOverlay: false` during cache generation.
   - Fog/unknown overlays are rendered as a lightweight visible-bounds pass on top.
3. Cache invalidation is now based on terrain/layout only:
   - detail level,
   - cell size,
   - terrain revision.
4. Fog display toggles no longer force terrain cache rebuild.

### Why this matters

- Player movement changes fog state frequently; decoupling fog from terrain cache avoids expensive full-map redraw work on every visibility update.
- Medium-detail zoom now benefits from the same “blit static terrain, draw dynamic overlays” strategy as low detail.
- Net result should be more stable frame pacing and lower sustained CPU load during pan/move workflows.

### Guardrails added

- New automated test verifies medium-detail cache behavior: second draw performs significantly fewer `drawCell` calls than first draw (terrain layer reuse).

## March 2026 regression fix: stale unknown (`?`) cells while moving on grassland

### Symptom

- After the optimization changes, entering unknown grassland sometimes did not reveal nearby cells around the hero (expected radius stayed as `?`).
- After moving away and returning, map visuals could become mixed: part of nearby terrain rendered discovered, part still rendered as stale `?`.

### Root cause

- Terrain-layer cache generation used per-cell runtime fog state.
- At cache-build time, many cells were still `unknown`, so the cache baked unknown visuals directly into the terrain layer.
- Because fog updates intentionally no longer invalidate terrain cache, those baked unknown cells persisted visually even when fog state later changed to discovered/hidden.

### Fix implemented

- Cache generation now always renders base terrain as `discovered` fog state.
- Dynamic fog (`unknown`/`hidden`) remains handled only by the dedicated fog overlay pass for currently visible cells.
- This keeps cache content fog-agnostic (stable terrain only) and prevents stale `?` artifacts.

### Regression coverage added

- Added automated test:
  - `WorldMap terrain cache render is fog-agnostic and does not draw unknown cells into cached terrain layer`
- Test asserts cache-build `drawCell(..., { showFogOverlay: false })` calls use only `discovered` fog state.

## April 2026 decision memo: optimize current canvas vs migrate to an engine

If the map is functionally correct but causes high laptop heat, we should treat this as a **performance-product decision**, not only a rendering-tech decision.

### Recommendation (short version)

- **Do one more focused optimization pass in the current architecture first** (1-2 PRs max, time-boxed).
- If the pass does **not** produce measurable thermal/frame-time improvement, then migrate the map renderer to a higher-level rendering stack.
- Avoid a full game-engine migration immediately unless we also plan to move input, UI, scene composition, and asset pipeline together.

### Why this recommendation

- Current code already has meaningful cache infrastructure and test coverage around world-map behavior.
- A full engine migration introduces large integration risk (save/load semantics, HUD consistency, battle/world mode coupling).
- If we can remove remaining hotspots (especially high-detail draw cost + overdraw + per-frame overlay churn), we may get most practical gains without rewriting core systems.

### High-ROI optimizations that are still possible without major architecture changes

1. **Dynamic resolution scaling for world map only**
   - Render world-map canvas at scale factor (for example 0.75) when frame-time budget is exceeded for N frames.
   - Upscale composited result to screen.
   - Often gives immediate thermal/CPU/GPU relief on laptops.

2. **Frame-budgeted overlay updates**
   - Keep terrain layer at full rate, but render expensive non-critical overlays every 2nd frame when under load.
   - Preserve cursor/selection feedback at full rate.

3. **Chunked cache invalidation**
   - Invalidate and rebuild only affected chunks around movement/fog changes, not full visible area.
   - Especially useful on large maps with frequent player moves.

4. **Color pipeline simplification**
   - Precompute palette variants per terrain class and avoid repeated runtime shade/alpha math in hot loops.
   - This also helps with perceived color inconsistency issues.

5. **DevicePixelRatio cap for map layer**
   - Clamp effective DPR for world-map canvas (for example max 1.25 or 1.5) while keeping UI text at native DPR.
   - Big win on high-DPI laptops where map detail does not benefit proportionally.

### If migration is needed: best-fit options

For this specific problem (many independent hoverable cells + camera + layered rendering), practical migration order:

1. **PixiJS (recommended first)**
   - Strong 2D rendering performance, straightforward texture/sprite batching, incremental adoption possible.
   - Can keep most gameplay logic and migrate rendering layer first.

2. **Phaser**
   - Good if you want more built-in game-framework features (scene lifecycle, physics options, input helpers).
   - Slightly heavier migration surface compared to PixiJS-only renderer swap.

3. **Godot/Unity**
   - Best if you intentionally want a long-term full-engine product pipeline.
   - Highest migration cost and biggest short-term delivery slowdown.

### Migration trigger criteria (use objective gates)

Proceed to renderer migration when **all** are true after the time-boxed optimization pass:

- P95 frame-time target is still missed in representative map scenarios.
- Thermal plateau remains uncomfortably high during 3-minute mixed map session.
- Optimization complexity is increasing faster than measured gains.

### Practical next step

- Run one final evidence-driven pass using `world-map-optimization-scientific-plan.md` protocol.
- Implement only 1-2 techniques above (start with DPR cap + dynamic resolution scaling).
- Compare before/after metrics.
- Decide keep-canvas vs Pixi migration based on data, not intuition.

## April 2026 protocol execution status update (Milestone 0 started)

- Added built-in draw-stage profiling hooks directly into `WorldMap.draw(...)`.
- Profiling is opt-in and can be enabled in runtime:
  - `setDrawProfilingEnabled(true)`
  - `resetDrawProfiling()`
  - `getDrawProfilingSnapshot()`
- Snapshot reports average/max/last timings for:
  - `drawTotal`
  - `terrainLayer`
  - `roads`
  - `locationFeatures`
  - `namedLocations`
  - `dayNightTint`
  - `focusOverlay`
  - `markers`
- Added automated regression coverage to ensure profiling API produces stable timing snapshots after map draws.

### How to see values while the global map is on screen

1. Open world map in-game.
2. Open DevTools console.
3. Run:
   - `const map = game?.worldMap ?? game?.worldModeController?.worldMap;`
   - `map.setDrawProfilingEnabled(true);`
   - `map.resetDrawProfiling();`
4. Pan/zoom/move on world map for ~30-60s.
5. Inspect:
   - `console.table(map.getDrawProfilingSnapshot());`
6. Disable profiling when done:
   - `map.setDrawProfilingEnabled(false);`

### Developer window alternative (recommended for quick QA)

- Open Developer Event Queue with `~`.
- Click **Open Profiling Panel** from developer console.
- Use the standalone **World map profiling** panel:
  - drag it like other HUD panels,
  - resize it like log/quests style panels,
  - enable profiling,
  - optionally enable auto-refresh,
  - inspect the live JSON snapshot directly in the panel.
- This removes the need to keep DevTools console open while testing map movement.

## April 12, 2026 field profiling update (user-provided zoom sweep)

Real in-game profiler sweep across seven zoom levels showed a **mid-zoom frame-time cliff**:

- Closest zoom: `drawTotal.avgMs ~4.58`, `terrainLayer.avgMs ~4.36`
- 28% out: `drawTotal.avgMs ~5.54`, `terrainLayer.avgMs ~5.21`
- 42% out: `drawTotal.avgMs ~7.24`, `terrainLayer.avgMs ~6.84`
- 56% out: `drawTotal.avgMs ~6.83`, `terrainLayer.avgMs ~6.43`
- 70% out: `drawTotal.avgMs ~10.00`, `terrainLayer.avgMs ~9.55`
- 84% out: `drawTotal.avgMs ~16.98`, `terrainLayer.avgMs ~16.30` (**worst point**)
- Farthest zoom: `drawTotal.avgMs ~9.18`, `terrainLayer.avgMs ~7.80`

### Interpretation

- `terrainLayer` dominates total frame cost in every sample.
- The non-monotonic shape (84% is worse than farthest zoom) indicates a **detail-level transition issue**, not only raw visible-cell growth.
- In practice, this matches the renderer behavior where the map may switch into `full` detail around that band, re-enabling expensive per-cell neighbor work without cache benefits.

### Follow-up change implemented

- Adjusted detail-level thresholds to keep more mid-zoom states in `medium` detail:
  - previous medium condition: `cellSize <= 14 || visibleCellCount >= 1400`
  - new medium condition: `cellSize <= 18 || visibleCellCount >= 900`
- Goal: avoid entering `full` detail while visible window is still large enough to make per-cell neighbor sampling expensive.

### What to verify next

1. Re-run the same seven zoom checkpoints and compare:
   - `drawTotal.avgMs`
   - `terrainLayer.avgMs`
   - `terrainLayer.maxMs`
2. Ensure close zoom visuals still look sufficiently rich (full detail should still be used when zoomed in enough).
3. If needed, tune thresholds one more time using the same profiler protocol rather than subjective feel.

## April 12, 2026 update: world-profiling render-layer checkboxes for isolation tests

Added five independent render-layer toggles to the **World Map Profiling** panel so QA can profile stage costs and machine thermals in controlled combinations:

- `Render terrain`
- `Render character marker`
- `Render locations`
- `Render roads`
- `Render selection cursor`

### Behavior details

- Each toggle immediately updates world-map rendering behavior at runtime.
- Toggling does **not** require reopening the profiling panel.
- If all five toggles are off, world-map draw path now short-circuits to a blank canvas (`clearRect`) and skips layer rendering entirely.
- Profiling JSON now includes a `renderLayers` object so recorded snapshots explicitly show which layers were enabled during capture.

### Practical profiling recipes

1. **Terrain-only baseline**
   - Enable only `Render terrain`.
   - Use this as primary baseline for draw-time + CPU load comparisons.
2. **Overlays-only impact**
   - Disable terrain, enable locations/roads/markers selectively.
   - Useful for measuring non-terrain overhead independently.
3. **Blank-canvas thermal/control state**
   - Disable all five toggles.
   - Confirms idle/global-map-overhead floor while world mode stays active.

### Related automated coverage

- Added tests to verify:
  - all-layer-off mode produces a blank map draw path (no background draw, explicit clear),
  - character marker and selection cursor toggles are independently respected.
## April 12, 2026 update: diagnostics expansion + dirty redraw pass

### What was added
- Extended the **existing World Map Profiling** panel payload with runtime metrics:
  - FPS,
  - rolling avg frame ms (last 60 rendered frames),
  - update ms and render ms,
  - visible/drawn tile counts,
  - approximate draw calls,
  - full redraw count,
  - raw mousemove events/sec,
  - hover-tile changes/sec,
  - per-frame booleans for camera moved / zoom changed / hovered tile changed,
  - canvas pixel size,
  - current effective devicePixelRatio,
  - `frameSkippedBecauseNoRedrawWasNeeded`.
- Added dirty redraw flags in world-map runtime state:
  - `worldNeedsRedraw`,
  - `overlayNeedsRedraw`,
  - `uiNeedsRedraw`.
- Added controls in the same profiling panel (no new panel):
  - render FPS cap: `uncapped`, `60`, `30`,
  - devicePixelRatio clamp: `auto`, `1.0`, `1.5`.
- Added per-section timing categories:
  - visible tile calculation,
  - terrain,
  - roads,
  - entities,
  - cursor/selection,
  - overlay/debug.

### Optimization behavior
- Mouse move no longer forces world-map selection redraw unless the hovered tile actually changed.
- Viewport bounds processing keeps a cull margin but avoids processing outside visible+margin windows.
- Disabled render layers now short-circuit their own per-layer work paths.
- Idle redraw now skips render work whenever world/overlay/UI are not dirty (subject to FPS cap logic when redraw is needed).

### Manual verification checklist
1. Open **Developer Console → World map profiling window** and open the profiling panel.
2. Toggle auto-refresh and observe metrics update.
3. **Idle test**: keep camera/zoom/hover unchanged; verify skipped-no-redraw metric rises and redraw activity stays minimal.
4. **Mouse move test**: move cursor inside a single tile repeatedly; hover-change/sec should stay low while raw mousemove/sec increases.
5. **Pan test**: middle-mouse drag; camera-changed metric should flip and redraw resume.
6. **Zoom test**: wheel / keyboard zoom; zoom-changed metric should flip and redraw resume.
7. **Layer toggle test**: disable terrain/roads/locations/character/cursor independently and observe section timings drop for disabled layers.
8. **FPS cap test**: switch uncapped → 60 → 30 and observe render cadence drop.
9. **DPR clamp test**: set auto/1.0/1.5 and resize window; confirm canvas pixel size and effective DPR in diagnostics reflect clamp.
