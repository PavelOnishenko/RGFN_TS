import test from 'node:test';
import assert from 'node:assert/strict';

import Player from '../../dist/entities/player/Player.js';
import WorldMap from '../../dist/systems/world/worldMap/WorldMap.js';
import MagicSystem from '../../dist/systems/controllers/magic/MagicSystem.js';
import GameTimeRuntime from '../../dist/systems/time/GameTimeRuntime.js';
import WorldSimulationRuntime from '../../dist/systems/world-sim/WorldSimulationRuntime.js';
import GameQuestRuntime from '../../dist/game/runtime/GameQuestRuntime.js';
import GamePersistenceRuntime from '../../dist/game/runtime/GamePersistenceRuntime.js';
import { createPlayer } from '../../dist/game/GameFactoryHelpers.js';
import { balanceConfig } from '../../dist/config/balance/balanceConfig.js';
import { NEXT_CHARACTER_ROLL_STORAGE_KEY } from '../../dist/utils/NextCharacterRollConfig.js';

function createLocalStorage(seed = {}) {
  const storage = new Map(Object.entries(seed));
  return {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => { storage.set(key, String(value)); },
    removeItem: (key) => { storage.delete(key); },
  };
}

function createAllocation(stat, points) {
  return {
    vitality: 0,
    toughness: 0,
    strength: 0,
    agility: 0,
    connection: 0,
    intelligence: 0,
    [stat]: points,
  };
}

function createSavedPlayerState(overrides = {}) {
  return {
    level: 4,
    name: 'Restored Wanderer',
    xp: 11,
    xpToNextLevel: 80,
    vitality: 4,
    toughness: 3,
    strength: 6,
    agility: 2,
    connection: 5,
    intelligence: 7,
    skillPoints: 1,
    magicPoints: 2,
    hp: 17,
    mana: 8,
    gold: 31,
    fatigue: 9,
    inventoryItems: [],
    equippedWeapon: null,
    equippedOffhandWeapon: null,
    equippedArmor: null,
    ...overrides,
  };
}

test('new startup consumes and applies a valid queued allocation exactly once', () => {
  const points = balanceConfig.player.initialRandomAllocatedSkillPoints;
  const storage = createLocalStorage({
    [NEXT_CHARACTER_ROLL_STORAGE_KEY]: JSON.stringify(createAllocation('strength', points)),
  });
  global.window = { localStorage: storage };

  const firstPlayer = createPlayer({ mode: 'new' });
  assert.equal(firstPlayer.strength, balanceConfig.player.initialStrength + points);
  assert.equal(storage.getItem(NEXT_CHARACTER_ROLL_STORAGE_KEY), null);

  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const secondPlayer = createPlayer({ mode: 'new' });
    assert.equal(secondPlayer.strength, balanceConfig.player.initialStrength);
    assert.equal(secondPlayer.vitality, balanceConfig.player.initialVitality + points);
  } finally {
    Math.random = originalRandom;
  }
});

test('restore startup creates a real Player without random initialization or consuming the queued allocation', () => {
  const points = balanceConfig.player.initialRandomAllocatedSkillPoints;
  const queued = JSON.stringify(createAllocation('agility', points));
  const storage = createLocalStorage({ [NEXT_CHARACTER_ROLL_STORAGE_KEY]: queued });
  global.window = { localStorage: storage };
  const originalRandom = Math.random;
  Math.random = () => { throw new Error('restore mode must not use Math.random'); };

  try {
    const player = createPlayer({ mode: 'restore', save: { player: createSavedPlayerState() } });

    assert.equal(player instanceof Player, true);
    assert.equal(player.name, 'Restored Wanderer');
    assert.equal(player.strength, 6);
    assert.equal(player.getInventory().length, 0);
    assert.equal(storage.getItem(NEXT_CHARACTER_ROLL_STORAGE_KEY), queued);
  } finally {
    Math.random = originalRandom;
  }
});

test('wrong-total queued allocation is removed and normal random allocation is used', () => {
  const points = balanceConfig.player.initialRandomAllocatedSkillPoints;
  const storage = createLocalStorage({
    [NEXT_CHARACTER_ROLL_STORAGE_KEY]: JSON.stringify(createAllocation('strength', Math.max(0, points - 1))),
  });
  global.window = { localStorage: storage };
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const player = createPlayer({ mode: 'new' });
    assert.equal(storage.getItem(NEXT_CHARACTER_ROLL_STORAGE_KEY), null);
    assert.equal(player.strength, balanceConfig.player.initialStrength);
    assert.equal(player.vitality, balanceConfig.player.initialVitality + points);
  } finally {
    Math.random = originalRandom;
  }
});

test('corrupt and incomplete saves fall back to a new player that can consume the queued allocation', async (t) => {
  const points = balanceConfig.player.initialRandomAllocatedSkillPoints;
  const invalidSaves = [
    ['corrupt', '{broken'],
    ['incomplete', JSON.stringify({ version: 3, worldMap: {}, player: {}, spellLevels: {} })],
  ];

  for (const [label, invalidSave] of invalidSaves) {
    await t.test(label, () => {
      const storage = createLocalStorage({
        rgfn_game_save_v2: invalidSave,
        [NEXT_CHARACTER_ROLL_STORAGE_KEY]: JSON.stringify(createAllocation('connection', points)),
      });
      global.window = { localStorage: storage };
      const persistence = new GamePersistenceRuntime('rgfn_game_save_v2', ['rgfn_game_save_v1']);
      const startupSave = persistence.loadValidatedSaveSnapshot();
      const player = createPlayer(startupSave ? { mode: 'restore', save: startupSave } : { mode: 'new' });

      assert.equal(startupSave, null);
      assert.equal(storage.getItem('rgfn_game_save_v2'), null);
      assert.equal(storage.getItem(NEXT_CHARACTER_ROLL_STORAGE_KEY), null);
      assert.equal(player.connection, balanceConfig.player.initialConnection + points);
    });
  }
});

test('restored startup systems use saved player, world coordinates, magic, time, quests, and simulation state', async () => {
  const sourceWorld = WorldMap.createNew(24, 18, 20);
  const savedWorld = sourceWorld.getState();
  const savedPlayer = createSavedPlayerState();
  const originalRandom = Math.random;
  Math.random = () => { throw new Error('restored world and player must not request a new random seed or character roll'); };

  let player;
  let worldMap;
  try {
    player = Player.fromSavedState(savedPlayer);
    worldMap = WorldMap.fromSavedState(24, 18, 20, savedWorld);
  } finally {
    Math.random = originalRandom;
  }

  const [expectedX, expectedY] = worldMap.getPlayerPixelPosition();
  player.x = expectedX;
  player.y = expectedY;
  assert.deepEqual(worldMap.getState().playerGridPos, savedWorld.playerGridPos);
  assert.equal(player.x, expectedX);
  assert.equal(player.y, expectedY);

  const magicSystem = new MagicSystem(player);
  magicSystem.restoreSpellLevels({ fireball: 3, curse: 2 });
  assert.equal(magicSystem.getSpellLevels().fireball, 3);
  assert.equal(magicSystem.getSpellLevels().curse, 2);

  const savedTime = { startYear: 902, months: [{ name: 'Ash', days: 25 }], totalMinutes: 4321 };
  const gameTime = new GameTimeRuntime(savedTime, 1);
  assert.deepEqual(gameTime.getState(), savedTime);

  const savedSimulation = {
    worldTick: 7,
    lastDelta: 15,
    pendingEvents: ['saved-event'],
    lastStageOrder: ['movement'],
    simulatedToMinute: 4321,
    npcs: {},
  };
  const simulation = new WorldSimulationRuntime();
  simulation.initialize(savedSimulation);
  assert.deepEqual(simulation.getState(), savedSimulation);

  const savedQuest = {
    id: 'main.saved',
    title: 'Saved Quest',
    description: '',
    conditionText: '',
    objectiveType: 'gather',
    entities: [],
    children: [],
    isCompleted: false,
  };
  const questRuntime = new GameQuestRuntime();
  let generated = false;
  await questRuntime.initialize(
    { generateMainQuest: async () => { generated = true; return savedQuest; } },
    { renderQuest: () => {}, showIntro: () => {} },
    () => savedQuest,
    () => {},
    { registerNamedLocation: () => {} },
  );
  assert.equal(generated, false);
  assert.equal(questRuntime.activeQuest, savedQuest);
});
