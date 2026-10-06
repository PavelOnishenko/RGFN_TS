import test from 'node:test';
import assert from 'node:assert/strict';

import GamePersistenceRuntime from '../../../dist/game/runtime/GamePersistenceRuntime.js';

function createLocalStorage(seed = {}) {
  const storage = new Map(Object.entries(seed));
  return {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => { storage.set(key, String(value)); },
    removeItem: (key) => { storage.delete(key); },
    clear: () => { storage.clear(); },
  };
}

function createValidPlayerState(overrides = {}) {
  return {
    level: 2,
    name: 'Test Wanderer',
    xp: 3,
    xpToNextLevel: 20,
    vitality: 2,
    toughness: 1,
    strength: 3,
    agility: 2,
    connection: 1,
    intelligence: 4,
    skillPoints: 0,
    magicPoints: 1,
    hp: 12,
    mana: 6,
    gold: 9,
    ...overrides,
  };
}

function createValidWorldMapState(overrides = {}) {
  return {
    worldSeed: 777,
    playerGridPos: { col: 12, row: 9 },
    fogStates: [['12,9', 'discovered']],
    villages: ['4,4'],
    visitedCells: ['12,9'],
    ...overrides,
  };
}

function createValidSave(overrides = {}) {
  return {
    version: 3,
    worldMap: createValidWorldMapState(),
    player: createValidPlayerState(),
    spellLevels: { fireball: 2, shield: 1 },
    quest: null,
    sideQuests: [],
    time: { day: 4 },
    worldSimulation: {},
    ...overrides,
  };
}

test('GamePersistenceRuntime roundtrip returns one validated complete snapshot', () => {
  global.window = { localStorage: createLocalStorage() };
  const runtime = new GamePersistenceRuntime('rgfn_game_save_v2', ['rgfn_game_save_v1']);
  const worldMapState = createValidWorldMapState();
  const playerState = createValidPlayerState({ hp: 15 });
  const spellLevels = { fireball: 2, shield: 1 };
  const worldSimulation = {
    npcs: [{ id: 'npc.1', village: 'Stonefield' }],
    monsters: [{ id: 'monster.3', biome: 'swamp' }],
    conflicts: [{ id: 'conflict.2', type: 'raid' }],
    factionControl: { Stonefield: 'guild_of_dawn' },
    debugCounter: 42,
  };

  runtime.saveGameIfChanged(
    { getState: () => worldMapState },
    { getState: () => playerState },
    { getSpellLevels: () => spellLevels },
    null,
    [],
    { day: 4 },
    worldSimulation,
  );

  const snapshot = runtime.loadValidatedSaveSnapshot();
  assert.equal(snapshot?.version, 3);
  assert.deepEqual(snapshot?.worldMap, worldMapState);
  assert.deepEqual(snapshot?.player, playerState);
  assert.deepEqual(snapshot?.spellLevels, spellLevels);
  assert.deepEqual(snapshot?.worldSimulation, worldSimulation);

  const overview = runtime.getOverview();
  assert.equal(overview.version, 3);
  assert.equal(typeof overview.snapshotHash, 'string');
  assert.equal(typeof overview.lastSavedAt, 'string');
  assert.equal(typeof overview.lastLoadedAt, 'string');
});

test('GamePersistenceRuntime migrates legacy v1 saves and preserves world simulation payloads', () => {
  const legacyRaw = JSON.stringify(createValidSave({
    version: 1,
    player: createValidPlayerState({ name: 'Legacy Hero' }),
    worldSimulation: undefined,
    npcs: [{ id: 'npc.legacy.1' }],
    monsters: [{ id: 'monster.legacy.1' }],
    conflicts: [{ id: 'conflict.legacy.1' }],
    factionControl: { Ironhold: 'wardens' },
  }));
  const queuedRoll = '{"vitality":5}';
  global.window = { localStorage: createLocalStorage({
    rgfn_game_save_v1: legacyRaw,
    rgfn_next_character_roll_v1: queuedRoll,
  }) };

  const runtime = new GamePersistenceRuntime('rgfn_game_save_v2', ['rgfn_game_save_v1']);
  const migrated = runtime.loadValidatedSaveSnapshot();

  assert.equal(migrated?.version, 3);
  assert.deepEqual(migrated?.worldSimulation, {
    npcs: [{ id: 'npc.legacy.1' }],
    monsters: [{ id: 'monster.legacy.1' }],
    conflicts: [{ id: 'conflict.legacy.1' }],
    factionControl: { Ironhold: 'wardens' },
  });
  assert.equal(JSON.parse(global.window.localStorage.getItem('rgfn_game_save_v2')).version, 3);
  assert.equal(global.window.localStorage.getItem('rgfn_game_save_v1'), null);
  assert.equal(global.window.localStorage.getItem('rgfn_next_character_roll_v1'), queuedRoll);
  assert.equal(runtime.getOverview().loadedVersion, 1);
});

test('GamePersistenceRuntime upgrades v2 world simulation saves to v3 without losing NPC task state', () => {
  const npcTaskState = {
    npcId: 'npc.saved',
    currentTask: 'hunt',
    currentCell: { col: 4, row: 5 },
    route: [{ col: 5, row: 5 }],
  };
  const versionTwoRaw = JSON.stringify(createValidSave({
    version: 2,
    worldMap: createValidWorldMapState({ worldSeed: 99 }),
    player: createValidPlayerState({ name: 'Version Two Hero' }),
    time: { totalMinutes: 700 },
    worldSimulation: { worldTick: 12, simulatedToMinute: 700, npcs: { 'npc.saved': npcTaskState } },
  }));
  global.window = { localStorage: createLocalStorage({ rgfn_game_save_v2: versionTwoRaw }) };

  const runtime = new GamePersistenceRuntime('rgfn_game_save_v2', ['rgfn_game_save_v1']);
  const migrated = runtime.loadValidatedSaveSnapshot();

  assert.equal(migrated?.version, 3);
  assert.deepEqual(migrated?.worldSimulation.npcs['npc.saved'], npcTaskState);
  assert.equal(JSON.parse(global.window.localStorage.getItem('rgfn_game_save_v2')).version, 3);
});

test('GamePersistenceRuntime clears current and legacy saves without deleting developer settings or the queued roll', () => {
  const localStorage = createLocalStorage({
    rgfn_game_save_v2: JSON.stringify(createValidSave()),
    rgfn_game_save_v1: JSON.stringify(createValidSave({ version: 1 })),
    rgfn_developer_random_config_v1: '{"mode":"pseudo"}',
    rgfn_next_character_roll_v1: '{"strength":8}',
  });
  global.window = { localStorage };
  const runtime = new GamePersistenceRuntime('rgfn_game_save_v2', ['rgfn_game_save_v1']);

  runtime.clearAllGameSaves();

  assert.equal(localStorage.getItem('rgfn_game_save_v2'), null);
  assert.equal(localStorage.getItem('rgfn_game_save_v1'), null);
  assert.notEqual(localStorage.getItem('rgfn_developer_random_config_v1'), null);
  assert.notEqual(localStorage.getItem('rgfn_next_character_roll_v1'), null);
});

test('GamePersistenceRuntime removes corrupt saves so they cannot break later startups', () => {
  const localStorage = createLocalStorage({ rgfn_game_save_v2: '{not-json' });
  global.window = { localStorage };
  const runtime = new GamePersistenceRuntime('rgfn_game_save_v2', ['rgfn_game_save_v1']);

  assert.equal(runtime.loadValidatedSaveSnapshot(), null);
  assert.equal(localStorage.getItem('rgfn_game_save_v2'), null);
  assert.equal(runtime.loadValidatedSaveSnapshot(), null);
});

test('GamePersistenceRuntime removes incomplete saves instead of restoring default-filled state', () => {
  const localStorage = createLocalStorage({
    rgfn_game_save_v2: JSON.stringify({ version: 3, worldMap: {}, player: {}, spellLevels: {} }),
  });
  global.window = { localStorage };
  const runtime = new GamePersistenceRuntime('rgfn_game_save_v2', ['rgfn_game_save_v1']);

  assert.equal(runtime.loadValidatedSaveSnapshot(), null);
  assert.equal(localStorage.getItem('rgfn_game_save_v2'), null);
});

test('GamePersistenceRuntime skips an invalid current key and restores a valid legacy save', () => {
  const legacySave = createValidSave({ version: 1, player: createValidPlayerState({ name: 'Legacy Survivor' }) });
  const localStorage = createLocalStorage({
    rgfn_game_save_v2: '{broken',
    rgfn_game_save_v1: JSON.stringify(legacySave),
  });
  global.window = { localStorage };
  const runtime = new GamePersistenceRuntime('rgfn_game_save_v2', ['rgfn_game_save_v1']);

  const restored = runtime.loadValidatedSaveSnapshot();

  assert.equal(restored?.player.name, 'Legacy Survivor');
  assert.equal(localStorage.getItem('rgfn_game_save_v1'), null);
  assert.equal(JSON.parse(localStorage.getItem('rgfn_game_save_v2')).version, 3);
});
