import test from 'node:test';
import assert from 'node:assert/strict';

import GameFacadeLifecycleCoordinator from '../../../dist/game/runtime/GameFacadeLifecycleCoordinator.js';

function createCoordinatorState({ firstRevealResult = false, secondRevealResult = true } = {}) {
  const worldMapCalls = { reveal: [], register: [] };
  const transitions = [];
  let revealCount = 0;
  return {
    coordinator: new GameFacadeLifecycleCoordinator({
      worldMap: {
        revealNamedLocation: (name) => {
          worldMapCalls.reveal.push(name);
          revealCount += 1;
          return revealCount === 1 ? firstRevealResult : secondRevealResult;
        },
        registerNamedLocation: (name) => {
          worldMapCalls.register.push(name);
        },
      },
      stateMachine: { transition: (mode) => transitions.push(mode) },
    }),
    worldMapCalls,
    transitions,
  };
}

test('GameFacadeLifecycleCoordinator retries quest location reveal after registering the location', () => {
  const { coordinator, worldMapCalls, transitions } = createCoordinatorState({ firstRevealResult: false, secondRevealResult: true });
  const shown = coordinator.onQuestLocationClick('Silver Ridge');

  assert.equal(shown, true);
  assert.deepEqual(worldMapCalls.reveal, ['Silver Ridge', 'Silver Ridge']);
  assert.deepEqual(worldMapCalls.register, ['Silver Ridge']);
  assert.equal(transitions.length, 1);
});

test('GameFacadeLifecycleCoordinator does not re-register location when first reveal succeeds', () => {
  const { coordinator, worldMapCalls, transitions } = createCoordinatorState({ firstRevealResult: true, secondRevealResult: true });
  const shown = coordinator.onQuestLocationClick('Silver Ridge');

  assert.equal(shown, true);
  assert.deepEqual(worldMapCalls.reveal, ['Silver Ridge']);
  assert.deepEqual(worldMapCalls.register, []);
  assert.equal(transitions.length, 1);
});

test('GameFacadeLifecycleCoordinator village entry forwards recover item callback and refreshes HUD when quest state changes', () => {
  const addedItems = [{ name: 'Lorka' }];
  let callbackInvocations = 0;
  let hudRefreshes = 0;
  const battleLogs = [];
  const enteredVillageModes = [];
  const groupUpdates = [];
  const coordinator = new GameFacadeLifecycleCoordinator({
    worldMap: {
      getVillageNameAtPlayerPosition: () => 'Golden Beacon',
      getSelectedCellInfo: () => null,
    },
    questRuntime: {
      recordLocationEntry: (_village, _carried, onRecoveredItemFound) => {
        callbackInvocations += 1;
        const wasAdded = onRecoveredItemFound({
          name: 'Torlys Eshlor',
        });
        return {
          changed: wasAdded,
          logs: ['Quest tracker: Found Torlys Eshlor lying on the ground in Golden Beacon.'],
        };
      },
      getGroupMembers: () => [{ name: 'Escort Ally', hp: 10, maxHp: 12, status: 'following' }],
    },
    player: {
      getInventory: () => [...addedItems],
      addItemToInventory: (item) => {
        addedItems.push({ name: item.name });
        return true;
      },
    },
    hudCoordinator: {
      addBattleLog: (line) => battleLogs.push(line),
      updateHUD: () => { hudRefreshes += 1; },
      updateSelectedCell: () => {},
      updateGroupPanel: (lines) => groupUpdates.push(lines),
    },
    villageCoordinator: {
      enterVillageMode: (width, height, villageName) => enteredVillageModes.push({ width, height, villageName }),
    },
    canvas: { width: 800, height: 600 },
  });

  coordinator.onVillageEntered();

  assert.equal(callbackInvocations, 1);
  assert.equal(addedItems.some((item) => item.name === 'Torlys Eshlor'), true);
  assert.equal(hudRefreshes, 1);
  assert.equal(battleLogs.some((line) => line.includes('Found Torlys Eshlor')), true);
  assert.equal(battleLogs.some((line) => line.includes('objectives updated at Golden Beacon')), true);
  assert.deepEqual(enteredVillageModes, [{ width: 800, height: 600, villageName: 'Golden Beacon' }]);
  assert.deepEqual(groupUpdates, [['Escort Ally — HP 10/12 (following)']]);
});

test('GameFacadeLifecycleCoordinator retries recovered item award when add reports success but inventory does not reflect the item', () => {
  const inventory = [{ name: 'Lorka' }];
  let addCalls = 0;
  const battleLogs = [];
  const coordinator = new GameFacadeLifecycleCoordinator({
    worldMap: {
      getVillageNameAtPlayerPosition: () => 'Golden Beacon',
      getSelectedCellInfo: () => null,
    },
    questRuntime: {
      recordLocationEntry: (_village, _carried, onRecoveredItemFound) => ({
        changed: onRecoveredItemFound({ name: 'Torlys Eshlor' }),
        logs: [],
      }),
      getGroupMembers: () => [],
    },
    player: {
      getInventory: () => [...inventory],
      addItemToInventory: (item) => {
        addCalls += 1;
        if (addCalls >= 2) {
          inventory.push({ name: item.name });
        }
        return true;
      },
    },
    hudCoordinator: {
      addBattleLog: (line) => battleLogs.push(line),
      updateHUD: () => {},
      updateSelectedCell: () => {},
      updateGroupPanel: () => {},
    },
    villageCoordinator: {
      enterVillageMode: () => {},
    },
    canvas: { width: 800, height: 600 },
  });

  coordinator.onVillageEntered();

  assert.equal(addCalls, 2);
  assert.equal(inventory.some((item) => item.name === 'Torlys Eshlor'), true);
  assert.equal(battleLogs.some((line) => line.includes('failed to persist recovered item')), false);
});

test('GameFacadeLifecycleCoordinator New Character stops saving, clears every game save, and reloads', () => {
  const originalWindow = globalThis.window;
  const calls = [];
  globalThis.window = { location: { reload: () => calls.push('reload') } };
  try {
    const coordinator = new GameFacadeLifecycleCoordinator({
      loop: { stop: () => calls.push('stop') },
      persistenceRuntime: { clearAllGameSaves: () => calls.push('clear') },
    });

    coordinator.startNewCharacter();

    assert.deepEqual(calls, ['stop', 'clear', 'reload']);
  } finally {
    globalThis.window = originalWindow;
  }
});
