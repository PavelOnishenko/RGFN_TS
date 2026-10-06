# Location Features System

## Summary
Location features are world-map gameplay overlays that can exist on top of terrain.

Current features:
- Village (`village`)
- Ferry dock (`ferry-dock`)

A cell can contain multiple location features at once.

## Architecture

### Contract + registry
- Contract: `js/systems/world/worldMap/locationFeatures/LocationFeatureDefinition.ts`
- Registry: `js/systems/world/worldMap/locationFeatures/LocationFeatureRegistry.ts`

Each feature provides:
- `id`
- `displayName`
- `render(...)`

### Runtime storage
`WorldMapCore` stores feature occupancy in:
- `locationFeatureIndexMap: Map<number, Set<LocationFeatureId>>`

Supported helpers:
- `addLocationFeatureAt(col, row, featureId)`
- `hasLocationFeatureAt(col, row, featureId)`
- `getLocationFeatureIdsAt(col, row)`
- `getLocationFeatureCells(featureId)`
- `clearLocationFeaturesById(featureId)`

## How village/ferry are handled now
- Villages are generated in `WorldMapWaterAndSettlements` and added as `village` feature.
- Ferry docks are derived in `WorldMapRoadNetwork` and added as `ferry-dock` feature.
- Rendering loops through registry definitions and feature occupancy rather than bespoke per-feature loops.

## Save/restore
`WorldMapPersistenceAndSelection` now serializes `locationFeatures` in map state.

Backward compatibility:
- If older save data has no `locationFeatures`, villages still restore from `villages` and ferry docks are regenerated from road network.

## Add a new location feature

### Minimum implementation
1. Add id in `LocationFeatureDefinition.ts` (`LocationFeatureId` union).
2. Create `YourFeatureLocationFeatureDefinition.ts` in `locationFeatures/`.
3. Register in `LocationFeatureRegistry.ts`.

### Placement
Call `addLocationFeatureAt(col, row, 'your-feature-id')` in the generation or runtime placement step.

### Optional lifecycle
If rebuilt each generation, call `clearLocationFeaturesById('your-feature-id')` before regeneration.

### Optional gameplay usage
- For checks: `hasLocationFeatureAt(...)`
- For multi-feature UI/logic: `getLocationFeatureIdsAt(...)`

## Scope estimate for a typical new feature
- New files: usually 1 (`*LocationFeatureDefinition.ts`)
- Required existing file edits: typically 2-4
  - registry,
  - id union,
  - generation/placement hook,
  - optional interaction/UI consumers.
