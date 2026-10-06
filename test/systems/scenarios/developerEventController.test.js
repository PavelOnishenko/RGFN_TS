import test from 'node:test';
import assert from 'node:assert/strict';

import DeveloperEventController from '../../../dist/systems/encounter/DeveloperEventController.js';
import EncounterSystem from '../../../dist/systems/encounter/EncounterSystem.js';

function createClassList(initial = []) {
  const values = new Set(initial);

  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    contains: (value) => values.has(value),
    toggle: (value, force) => {
      if (typeof force === 'boolean') {
        if (force) {
          values.add(value);
        } else {
          values.delete(value);
        }
        return values.has(value);
      }
      if (values.has(value)) {
        values.delete(value);
        return false;
      }
      values.add(value);
      return true;
    },
  };
}

function createDeveloperUi() {
  const createInput = () => ({ value: '0', checked: true });
  const createEventTarget = () => ({
    listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; },
    removeEventListener(type) { delete this.listeners[type]; },
    setPointerCapture() {},
    releasePointerCapture() {},
  });

  return {
    modal: { classList: createClassList(['hidden']) },
    eventType: { value: 'item' },
    queueList: { innerHTML: '', appendChild: () => {} },
    encounterTypeSummary: { textContent: '' },
    encounterTypeToggles: {
      monster: createInput(),
      item: createInput(),
      traveler: createInput(),
    },
    nextRollSummary: { textContent: '' },
    nextRollModal: { classList: createClassList(['hidden']) },
    nextRollTotal: { textContent: '' },
    nextRollStatus: { textContent: '', classList: createClassList() },
    nextRollInputs: {
      vitality: createInput(),
      toughness: createInput(),
      strength: createInput(),
      agility: createInput(),
      connection: createInput(),
      intelligence: createInput(),
    },
    randomModeSelect: { value: 'true' },
    randomSeedInput: { value: 'rgfn-default-seed', disabled: false },
    randomSummary: { textContent: '' },
    randomStatus: { textContent: '', classList: createClassList() },
    randomApplyBtn: {},
    developerModeToggle: { checked: false },
    everythingDiscoveredToggle: { checked: false },
    fogOfWarToggle: { checked: true },
    worldMapProfilingToggle: { checked: false },
    worldMapProfilingOpenBtn: createEventTarget(),
    worldMapProfilingPanel: { classList: createClassList(['hidden']), dataset: {}, style: { setProperty: () => {} } },
    worldMapProfilingDragHandle: createEventTarget(),
    worldMapProfilingCornerDragHandle: createEventTarget(),
    worldMapProfilingCloseBtn: createEventTarget(),
    worldMapProfilingRefreshBtn: createEventTarget(),
    worldMapProfilingAutoRefreshToggle: { checked: false },
    worldMapProfilingFpsCapSelect: { value: 'uncapped' },
    worldMapProfilingDevicePixelRatioClampSelect: { value: 'auto' },
    worldMapProfilingRenderLayerToggles: {
      terrain: createInput(),
      character: createInput(),
      locations: createInput(),
      roads: createInput(),
      selectionCursor: createInput(),
    },
    worldMapProfilingOutput: { textContent: '' },
    worldInfoOverviewOutput: { textContent: '' },
  };
}

function createController(logs, encounterSystem, developerUI) {
  global.document ??= { getElementById: () => null };
  const mapDisplayConfig = {
    everythingDiscovered: false,
    fogOfWar: true,
  };
  let worldMapProfilingEnabled = false;
  const worldMapLayerToggles = { terrain: true, character: true, locations: true, roads: true, selectionCursor: true };
  let worldMapRenderFpsCap = 'uncapped';
  let worldMapDprClamp = 'auto';
  const worldMapSnapshot = {
    drawTotal: { frames: 3, avgMs: 7.25, maxMs: 11.6, lastFrameMs: 8.1 },
    terrainLayer: { frames: 3, avgMs: 4.12, maxMs: 6.4, lastFrameMs: 4.3 },
  };

  return new DeveloperEventController(developerUI, encounterSystem, {
    addVillageLog: (message) => logs.push(message),
    getEventLabel: (type) => type,
    getMapDisplayConfig: () => ({ ...mapDisplayConfig }),
    setMapDisplayConfig: (config) => Object.assign(mapDisplayConfig, config),
    setWorldMapDrawProfilingEnabled: (enabled) => {
      worldMapProfilingEnabled = Boolean(enabled);
    },
    isWorldMapDrawProfilingEnabled: () => worldMapProfilingEnabled,
    resetWorldMapDrawProfiling: () => {
      worldMapSnapshot.drawTotal = { ...worldMapSnapshot.drawTotal, frames: 0, avgMs: 0, maxMs: 0, lastFrameMs: 0 };
      worldMapSnapshot.terrainLayer = { ...worldMapSnapshot.terrainLayer, frames: 0, avgMs: 0, maxMs: 0, lastFrameMs: 0 };
    },
    getWorldMapDrawProfilingSnapshot: () => ({ ...worldMapSnapshot }),
    getWorldMapPerformanceSnapshot: () => ({ cacheHits: 3, cacheRebuilds: 1 }),
    getWorldMapPointerSnapshot: () => ({ hoverTileChangesPerSecond: 5, rawMouseMoveEventsPerSecond: 42 }),
    getWorldMapRenderLayerToggles: () => ({ ...worldMapLayerToggles }),
    setWorldMapRenderLayerToggles: (toggles) => Object.assign(worldMapLayerToggles, toggles),
    getWorldMapRenderFpsCap: () => worldMapRenderFpsCap,
    setWorldMapRenderFpsCap: (cap) => { worldMapRenderFpsCap = cap; },
    getWorldMapDevicePixelRatioClamp: () => worldMapDprClamp,
    setWorldMapDevicePixelRatioClamp: (clamp) => { worldMapDprClamp = clamp; },
    getWorldSimulationOverview: () => ({ worldTick: 0, lastDelta: 0, pendingEvents: [] }),
    getPersistenceOverview: () => ({
      key: 'rgfn_game_save_v2',
      version: 3,
      loadedVersion: null,
      snapshotHash: null,
      lastSavedAt: null,
      lastLoadedAt: null,
    }),
  });
}

test('DeveloperEventController updates encounter toggle summary when a type is disabled', () => {
  const logs = [];
  const encounterSystem = new EncounterSystem(1);
  const developerUI = createDeveloperUi();
  const controller = createController(logs, encounterSystem, developerUI);

  controller.handleEncounterTypeToggle('item', false);

  assert.equal(encounterSystem.isEncounterTypeEnabled('item'), false);
  assert.equal(developerUI.encounterTypeToggles.item.checked, false);
  assert.equal(developerUI.encounterTypeSummary.textContent, 'Enabled random encounters: Monster, Traveler.');
  assert.equal(logs[0], '[DEV] Item encounters disabled.');
});

test('DeveloperEventController can disable all random encounter types from the dev console', () => {
  const logs = [];
  const encounterSystem = new EncounterSystem(1);
  const developerUI = createDeveloperUi();
  const controller = createController(logs, encounterSystem, developerUI);

  controller.handleEncounterTypesToggleAll(false);

  assert.deepEqual(encounterSystem.getEncounterTypeStates(), {
    monster: false,
    item: false,
    traveler: false,
  });
  assert.equal(developerUI.encounterTypeSummary.textContent, 'Random encounters disabled. Forced queue still works.');
  assert.equal(logs[0], '[DEV] Disabled all random encounter types.');
});

test('DeveloperEventController syncs and updates map display toggles from the dev console', () => {
  const logs = [];
  const encounterSystem = new EncounterSystem(1);
  const developerUI = createDeveloperUi();
  const controller = createController(logs, encounterSystem, developerUI);

  controller.handleMapDisplayToggle('everythingDiscovered', true);
  controller.handleMapDisplayToggle('fogOfWar', false);

  assert.equal(developerUI.everythingDiscoveredToggle.checked, true);
  assert.equal(developerUI.fogOfWarToggle.checked, false);
  assert.deepEqual(logs.slice(-2), [
    '[DEV] Everything discovered enabled.',
    '[DEV] Fog of war disabled.',
  ]);
});


test('DeveloperEventController applies pseudo-random settings from the dev console', () => {
  const logs = [];
  const encounterSystem = new EncounterSystem(1);
  const developerUI = createDeveloperUi();
  const controller = createController(logs, encounterSystem, developerUI);

  developerUI.randomModeSelect.value = 'pseudo';
  developerUI.randomSeedInput.value = 'repeatable-run';
  controller.handleRandomSettingsApply();

  assert.equal(developerUI.randomSeedInput.disabled, false);
  assert.match(developerUI.randomSummary.textContent, /pseudo random/i);
  assert.match(developerUI.randomSummary.textContent, /repeatable-run/);
  assert.match(developerUI.randomStatus.textContent, /Use New Character to replay/i);
  assert.equal(logs.at(-1), '[DEV] Random provider set to pseudo random (seed: repeatable-run).');
});

test('DeveloperEventController applies persistent developer mode presets', () => {
  const logs = [];
  const encounterSystem = new EncounterSystem(1);
  const developerUI = createDeveloperUi();
  const controller = createController(logs, encounterSystem, developerUI);

  controller.handleDeveloperModeToggle(true);

  assert.equal(developerUI.developerModeToggle.checked, true);
  assert.equal(developerUI.everythingDiscoveredToggle.checked, true);
  assert.deepEqual(encounterSystem.getEncounterTypeStates(), {
    monster: false,
    item: false,
    traveler: false,
  });
  assert.equal(logs.at(-1), '[DEV] Persistent developer mode enabled.');
});

test('DeveloperEventController renders world-map profiling snapshot in developer panel output', () => {
  const logs = [];
  const encounterSystem = new EncounterSystem(1);
  const developerUI = createDeveloperUi();
  const controller = createController(logs, encounterSystem, developerUI);

  controller.renderWorldMapProfilingPanel();
  assert.match(developerUI.worldMapProfilingOutput.textContent, /drawTotal/);

  developerUI.worldMapProfilingToggle.checked = true;
  controller.handleWorldMapDrawProfilingToggle(true);
  assert.equal(logs.at(-1), '[DEV] World-map draw profiling enabled and reset.');
  assert.match(developerUI.worldMapProfilingOutput.textContent, /\"profilingEnabled\": true/);

  controller.handleWorldMapProfilingRefresh();
  assert.match(developerUI.worldMapProfilingOutput.textContent, /\"capturedAt\"/);
});

test('DeveloperEventController opens standalone world-map profiling panel from hidden state', () => {
  const logs = [];
  const encounterSystem = new EncounterSystem(1);
  const developerUI = createDeveloperUi();
  const controller = createController(logs, encounterSystem, developerUI);

  controller.toggleWorldMapProfilingPanel(true);

  assert.equal(developerUI.worldMapProfilingPanel.classList.contains('hidden'), false);
  assert.equal(developerUI.worldMapProfilingPanel.dataset.spawnPositioned, 'true');
  assert.match(developerUI.worldMapProfilingOutput.textContent, /\"sections\"/);
});

test('DeveloperEventController drags the profiling panel from its separate corner grip', () => {
  const logs = [];
  const encounters = new EncounterSystem();
  const developerUI = createDeveloperUi();
  createController(logs, encounters, developerUI);

  const cornerDragHandle = developerUI.worldMapProfilingCornerDragHandle;
  cornerDragHandle.listeners.pointerdown({
    button: 0,
    pointerId: 17,
    clientX: 420,
    clientY: 390,
    preventDefault() {},
  });
  cornerDragHandle.listeners.pointermove({ clientX: 360, clientY: 330 });
  cornerDragHandle.listeners.pointerup();

  assert.equal(developerUI.worldMapProfilingPanel.dataset.offsetX, '-60');
  assert.equal(developerUI.worldMapProfilingPanel.dataset.offsetY, '-60');
  assert.equal(developerUI.worldMapProfilingPanel.classList.contains('panel-dragging'), false);
});
