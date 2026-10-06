# RGFN: Location feature definition + registry refactor (2026-04-01)

## Goal
Apply the same expansion pattern used for spells to world-map **location features** (currently village + ferry dock), so adding a new feature is predictable and additive.

## What was introduced

### 1) New location feature contract layer
New folder:
- `js/systems/world/worldMap/locationFeatures/`

Contract file:
- `LocationFeatureDefinition.ts`

This defines:
- feature identity (`LocationFeatureId`),
- author-facing display metadata (`displayName`),
- rendering behavior via a single `render(...)` method.

### 2) One class per location feature
Each feature now has its own module:
- `VillageLocationFeatureDefinition.ts`
- `FerryDockLocationFeatureDefinition.ts`

### 3) Central location feature registry
`LocationFeatureRegistry.ts` now centralizes all registered features and supports:
- list all definitions (`getLocationFeatureDefinitions()`),
- fetch one by id (`getLocationFeatureDefinitionById()`),
- list valid ids (`getLocationFeatureIds()`).

### 4) Shared runtime storage for many features per cell
`WorldMapCore` now keeps `locationFeatureIndexMap: Map<number, Set<LocationFeatureId>>`, allowing:
- zero, one, or many features on one world-map cell,
- independent feature registration/removal,
- per-cell feature lookup (`getLocationFeatureIdsAt`).

This is the structural piece required for stacked features.

## Existing behavior kept compatible
- Village and ferry systems still behave as before (prompts, roads, travel).
- Legacy save compatibility is preserved:
  - if `locationFeatures` is absent in save data, villages are rebuilt from existing `villages` state and ferry docks are regenerated from roads.

## Files changed in this refactor

### New files (4)
1. `js/systems/world/worldMap/locationFeatures/LocationFeatureDefinition.ts`
2. `js/systems/world/worldMap/locationFeatures/VillageLocationFeatureDefinition.ts`
3. `js/systems/world/worldMap/locationFeatures/FerryDockLocationFeatureDefinition.ts`
4. `js/systems/world/worldMap/locationFeatures/LocationFeatureRegistry.ts`

### Existing files updated (6)
1. `js/systems/world/worldMap/WorldMapCore.ts`
2. `js/systems/world/worldMap/layers/WorldMapWaterAndSettlements.ts`
3. `js/systems/world/worldMap/WorldMapRoadNetwork.ts`
4. `js/systems/world/worldMap/layers/WorldMapNamedLocationAndVillageOverlays.ts`
5. `js/systems/world/worldMap/WorldMapPersistenceAndSelection.ts`
6. `js/types/game.ts`

## How to add a new location feature

Example target feature: **Shrine**.

### Required files
1. Add one definition file in `locationFeatures/`:
   - `ShrineLocationFeatureDefinition.ts`
2. Register it in:
   - `LocationFeatureRegistry.ts`
3. Extend `LocationFeatureId` union in:
   - `LocationFeatureDefinition.ts`

### Required wiring changes (where and why)
1. **Generation / placement source**
   - Add logic where this feature should appear (world generation step, road post-processing, quest-driven placement, etc.).
   - Use `addLocationFeatureAt(col, row, 'shrine')`.

2. **Optional cleanup/reset behavior**
   - If the feature is regenerated from scratch during map build, clear stale data with `clearLocationFeaturesById('shrine')` before rebuilding.

3. **Optional interaction hooks**
   - If shrine has gameplay interaction (prompt, action button, travel, buffs), hook consumers with `hasLocationFeatureAt(...)` or `getLocationFeatureIdsAt(...)`.

4. **Optional selected-cell UX**
   - `getSelectedCellInfo()` already exposes `locationFeatureIds`, so UI can be extended without touching map generation.

## Practical authoring checklist
- [ ] Add id to `LocationFeatureId`.
- [ ] Add `*LocationFeatureDefinition.ts` class.
- [ ] Register class in `LocationFeatureRegistry.ts`.
- [ ] Add spawn/placement pipeline call to `addLocationFeatureAt`.
- [ ] Add cleanup via `clearLocationFeaturesById` if needed.
- [ ] Add any interaction hooks.
- [ ] Add/adjust tests.

## Why this matters
This removes special-case coupling where every new feature required custom ad-hoc sets and draw loops. The world map now has one expandable feature model (contract + registry + indexed storage), matching the spell architecture direction.
