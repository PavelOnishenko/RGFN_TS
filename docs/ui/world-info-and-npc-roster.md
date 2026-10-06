# World Info panel + global NPC list (developer mode)

## What changed

- **World Info moved out of the developer console** (`~` modal) into a regular draggable HUD panel opened from the hamburger menu.
- The hamburger menu now has a **World Info** button that is visible only when persistent developer mode is enabled.
- The World Info panel includes a direct **Open NPC List** action.
- NPC roster entries now include:
  - NPC name
  - Occupation
  - Village name
  - Exact world tile coordinates `(col, row)` for that village
  - Life status/personality metadata

## Runtime behavior

- On game runtime initialization, we now pre-generate village NPC passports for **all villages currently generated on the world map**.
- The call is explicit in runtime assembly path:
  1. `createRuntimeBase(...)` constructs `WorldMap`, which runs world generation (villages are created there).
  2. `createVillageRuntime(...)` constructs `VillageActionsController`.
  3. After save restoration, the lifecycle calls `resetAndInitializeWorldNpcPopulation()` when no saved NPC population was restored.
  4. `initializeWorldNpcPopulation()` iterates `getAllVillagePlacements()` and generates/upserts roster entries for each village.
- Initialization is guarded with `isWorldNpcPopulationInitialized` to avoid accidental duplicate full-world population if called more than once in a runtime.
- Immediately after pre-generation completes, `renderRosterPanel()` is called so the NPC roster UI is populated before entering any village.
- Village entry no longer creates first-time villagers for those villages; it pulls from the global roster generated at world generation time.
- Quest-specific NPC injections still upsert into the same global roster and remain compatible with the pre-generated data.
- Pre-generation intentionally runs for every world village placement without short-circuiting per-village existence checks, so a partial prefilled roster cannot prevent generation for later villages.

## Data model notes

- `VillageNpcPassport` now stores optional village tile coordinates:
  - `tileCol: number | null`
  - `tileRow: number | null`
- `VillageNpcRoster.upsert(...)` accepts optional village tile coordinates so that world-generation placement metadata can be preserved as source-of-truth.

## Integration points

- World map exposes `getAllVillagePlacements()` with `{ name, col, row }[]`.
- Village actions callbacks now support `getAllVillagePlacements`.
- Startup initializes the world NPC population after save restoration only when no saved NPC states were restored.

## Why this structure

- Keeps developer-only debugging information inside the same HUD panel UX as gameplay panels.
- Avoids hidden data generation timing bugs by establishing a deterministic global NPC list at world generation stage.
- Ensures village NPCs seen in villages and NPCs shown in roster panel are backed by the same source.
- Keeps generation idempotent via `upsert` while still covering the full village list on startup.
