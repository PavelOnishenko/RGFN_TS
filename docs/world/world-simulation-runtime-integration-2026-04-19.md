# World Simulation Runtime Integration (2026-04-19)

## What was added

- Added `WorldSimulationRuntime` with required API:
  - `initialize(initialState?)`
  - `tick(deltaMinutes)`
  - `getState()`
  - `restoreState(state)`
- Added deterministic stage pipeline order per tick:
  1. `movement`
  2. `taskAssign`
  3. `taskProgress`
  4. `conflicts`
  5. `villages`
- Added persistence support for world simulation snapshot in save payload.
- Save format upgraded to **v2** (`rgfn_game_save_v2`) with automatic migration from legacy key/format (`rgfn_game_save_v1`, version `1` payloads).
- Legacy migration now lifts old top-level world simulation fields into `worldSimulation` so the following categories are preserved on reload without data loss:
  - `npcs`
  - `monsters`
  - `conflicts`
  - `factionControl`
- Added world simulation ticking from gameplay time progression (`advanceTime`), which is triggered by world/village player actions.
- Added a developer-only World Info section with an `Overview` tab in the Developer Event Queue modal.

## Runtime contract

`WorldSimulationRuntime.getState()` returns:

```ts
{
  worldTick: number;
  lastDelta: number;
  pendingEvents: string[];
  lastStageOrder: Array<'movement' | 'taskAssign' | 'taskProgress' | 'conflicts' | 'villages'>;
}
```

### Notes

- `worldTick` is monotonic and increments once per `tick(...)` call.
- `lastDelta` stores the sanitized non-negative delta from the latest call.
- `pendingEvents` is currently a capped rolling buffer (up to 64 entries), safe for debug/inspection.
- `lastStageOrder` is updated every tick and is used to assert pipeline sequencing in tests.

## Why ticking is integrated via `advanceTime`

In the current architecture, most meaningful player actions in world/village modes route through `onAdvanceTime(...)` callbacks (travel, ferry, village interactions, rest/wait, trade actions, etc.).

Hooking `WorldSimulationRuntime.tick(deltaMinutes)` into `GameFacade.advanceTime(...)` ensures:

- one consistent integration point,
- no duplicate ticking scattered across UI handlers,
- easy persistence and inspection.

## Developer UI: World Info / Overview

A new block was added to Developer Event Queue modal:

- Section title: `World Info`
- Tablist (currently one tab): `Overview`
- JSON output fields:
  - `worldTick`
  - `lastDelta`
  - `pendingEvents`
  - `pendingEventsCount`
  - `persistence`:
    - `key`
    - `version`
    - `loadedVersion`
    - `snapshotHash`
    - `lastSavedAt`
    - `lastLoadedAt`
  - `capturedAt`

## Automated test coverage

Added minimal automated checks for:

1. `worldTick` growth across sequential ticks.
2. exact stage order execution in one tick.
3. save/load roundtrip keeps `worldSimulation` snapshot byte-for-byte for critical world-state domains.
4. migration from legacy save format upgrades payload to v2 and preserves `npcs/monsters/conflicts/factionControl`.

These tests live in:

- `rgfn_game/test/systems/worldSimulationRuntime.test.js`
- `rgfn_game/test/game/runtime/gamePersistenceRuntime.test.js`

## UI manual verification checklist (issue checklist)

- [ ] Start RGFN build and launch game UI.
- [ ] Open Developer Event Queue (press `~`).
- [ ] Confirm new **World Info** section is visible.
- [ ] Confirm **Overview** tab exists and is active.
- [ ] Verify initial snapshot shows numeric `worldTick` and `lastDelta`.
- [ ] In the same snapshot verify **Persistence** block exists and displays:
  - [ ] `version: 2`
  - [ ] non-empty `snapshotHash` after first auto-save event
  - [ ] ISO timestamps in `lastSavedAt`/`lastLoadedAt`
- [ ] Perform one action that advances time (e.g., move on world map to trigger travel time).
- [ ] Re-open/refresh World Info Overview and verify `worldTick` increased.
- [ ] Perform another distinct time-advancing action (e.g., village interaction / ferry travel / wait/rest).
- [ ] Verify `worldTick` increased again.
- [ ] Verify `lastDelta` updates according to action time cost.
- [ ] Verify `pendingEvents` is non-empty and includes stage-tagged entries.
- [ ] Save/reload (if using persistent save flow) and verify simulation snapshot restores without reset when save exists.

## Step-by-step reload validation scenario (for issue QA)

1. **Prepare legacy save fixture**
   1. Open DevTools Console.
   2. Write a synthetic v1 save:
      - key: `rgfn_game_save_v1`
      - include top-level `npcs`, `monsters`, `conflicts`, `factionControl`.
2. **Hard reload page** (`Ctrl+Shift+R`).
3. **Open World Info → Overview** and verify:
   - `persistence.loadedVersion === 1` (first boot after migration),
   - runtime data is present (`worldTick`, `pendingEvents`),
   - migrated data is active (NPC/monster/conflict/faction-control-driven behavior appears unchanged in debug panels/gameplay).
4. **Confirm rewritten save key**
   - In Local Storage, verify `rgfn_game_save_v2` exists.
   - Inspect JSON and confirm migrated `worldSimulation` contains the four world-domain fields above.
5. **Trigger at least one more save**
   - Perform a time-advancing action.
   - Re-open Overview and verify `snapshotHash` changed and `lastSavedAt` updated.
6. **Reload again**
   - After second reload, verify `persistence.loadedVersion === 2`.
   - Confirm no regression/loss in NPC/monster/conflict/faction-control data.

## Extra implementation notes for future phases

- Current pipeline stage handlers intentionally provide lightweight placeholders/events.
- Domain-specific logic for assignments/conflicts/villages can be incrementally injected into each stage while preserving API.
- If UI payload grows large, consider:
  - pagination/virtualization,
  - partial event projection,
  - compact mode in the Overview tab.
