import test from 'node:test';
import assert from 'node:assert/strict';

import BattleCommandController from '../../../dist/systems/game/BattleCommandController.js';
import Skeleton from '../../../dist/entities/Skeleton.js';
import Wanderer from '../../../dist/entities/Wanderer.js';
import Item from '../../../dist/entities/Item.js';
import { balanceConfig } from '../../../dist/config/balance/balanceConfig.js';

function createController(logs, lootedNames) {
  const player = {
    level: 1,
    addXp() {
      return false;
    },
    addItemToInventory(item) {
      lootedNames.push(item.name);
      return true;
    },
  };

  const turnManager = {
    getPlayerSideParticipantCount: () => 1,
  };

  return new BattleCommandController(
    {},
    player,
    {},
    turnManager,
    {},
    {
      onUpdateHUD: () => {},
      onAddBattleLog: (message) => logs.push(message),
      onEnableBattleButtons: () => {},
      onProcessTurn: () => {},
      onEndBattle: () => {},
      onPlayerTurnTransitionStart: () => {},
      onPlayerTurnReady: () => {},
      getSelectedEnemy: () => null,
      setSelectedEnemy: () => {},
    }
  );
}

test('BattleCommandController gives random drop for monsters based on balance config chance', () => {
  const logs = [];
  const looted = [];
  const controller = createController(logs, looted);

  const originalChance = balanceConfig.items.monsterDropChance;
  const originalPool = balanceConfig.items.discoveryPool;
  const originalRandom = Math.random;

  balanceConfig.items.monsterDropChance = 1;
  balanceConfig.items.discoveryPool = [{ id: 'healingPotion', weight: 1 }];
  Math.random = () => 0;

  const skeleton = new Skeleton(0, 0, balanceConfig.enemies.skeleton);
  controller['handleTargetDefeated'](skeleton);
  controller.resolvePendingLoot();

  Math.random = originalRandom;
  balanceConfig.items.monsterDropChance = originalChance;
  balanceConfig.items.discoveryPool = originalPool;

  assert.equal(looted.length, 1);
  assert.equal(looted[0], 'Healing Potion');
});

test('BattleCommandController loots all human inventory without adding random monster drop', () => {
  const logs = [];
  const looted = [];
  const controller = createController(logs, looted);

  const inventory = [
    new Item({ id: 'knife_t1', name: 'Knife +1', description: '', type: 'weapon', damageBonus: 1 }),
    new Item({ id: 'armor_t1', name: 'Armor +1', description: '', type: 'armor', effects: { flatArmor: 1 } }),
  ];

  const originalChance = balanceConfig.items.monsterDropChance;
  balanceConfig.items.monsterDropChance = 1;

  const wanderer = new Wanderer(2, inventory);
  controller['handleTargetDefeated'](wanderer);
  controller.resolvePendingLoot();

  balanceConfig.items.monsterDropChance = originalChance;

  assert.equal(looted.length, inventory.length);
  assert.deepEqual(looted, inventory.map((item) => item.name));
});

test('BattleCommandController equipment action in battle consumes extra turns', () => {
  const logs = [];
  let consumedTurns = 0;
  let nextTurnCalls = 0;
  let processTurnCalls = 0;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    fn();
    return 0;
  };

  const controller = new BattleCommandController(
    { isInState: () => true },
    { expireDirectionalBonusesWithoutAttack: () => [] },
    {},
    {
      isPlayerTurn: () => true,
      waitingForPlayer: true,
      consumeUpcomingTurns: (_entity, turns) => { consumedTurns = turns; },
      nextTurn: () => { nextTurnCalls += 1; },
    },
    {},
    {
      onUpdateHUD: () => {},
      onAddBattleLog: (message) => logs.push(message),
      onEnableBattleButtons: () => {},
      onProcessTurn: () => { processTurnCalls += 1; },
      onEndBattle: () => {},
      onPlayerTurnTransitionStart: () => {},
      onPlayerTurnReady: () => {},
      getSelectedEnemy: () => null,
      setSelectedEnemy: () => {},
    }
  );

  const result = controller.handleEquipmentAction('You begin equipping Spear +2.');
  globalThis.setTimeout = originalSetTimeout;

  assert.equal(result, true);
  assert.equal(consumedTurns, 2);
  assert.equal(nextTurnCalls, 1);
  assert.equal(processTurnCalls, 1);
  assert.equal(logs.some((entry) => entry.includes('takes 3 turns')), true);
});
