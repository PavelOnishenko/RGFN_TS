import test from 'node:test';
import assert from 'node:assert/strict';

import BattleTurnController from '../../../dist/systems/game/BattleTurnController.js';
import TurnManager from '../../../dist/systems/combat/TurnManager.js';

class Player {
  constructor() {
    this.active = true;
    this.id = 1;
    this.avoidChance = 0;
    this.armor = 0;
  }

  isDead() {
    return false;
  }

  consumePlayerTurnEffects() {
    return [];
  }
}

class Skeleton {
  constructor(id, name) {
    this.active = true;
    this.id = id;
    this.name = name;
    this.damage = 1;
  }

  isDead() {
    return false;
  }

  shouldSkipTurnFromSlow() {
    return false;
  }

  shouldSkipTurn() {
    return this.shouldSkipTurnFromSlow();
  }

  consumeTurnEffects() {
    return [];
  }
}

test('BattleTurnController skips an enemy turn already consumed by directional combat', async () => {
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback) => {
    callback();
    return 0;
  };

  try {
    const player = new Player();
    const firstEnemy = new Skeleton(2, 'Skeleton A');
    const secondEnemy = new Skeleton(3, 'Skeleton B');
    const turnManager = new TurnManager();
    turnManager.initializeTurns([player, firstEnemy, secondEnemy]);
    turnManager.consumeUpcomingTurn(firstEnemy);
    turnManager.nextTurn();

    const logs = [];
    let playerReadyCount = 0;
    const battleTurnController = new BattleTurnController(
      {
        isInAttackRange: () => false,
        moveEntityToward: () => {},
      },
      turnManager,
      player,
      {
        onAddBattleLog: (message) => logs.push(message),
        onUpdateHUD: () => {},
        onEnableBattleButtons: () => {},
        onBattleEnd: () => {},
        onPlayerTurnReady: () => { playerReadyCount += 1; },
      }
    );

    battleTurnController.processTurn();

    assert.equal(logs.includes('Skeleton A attacks!'), false);
    assert.equal(logs.includes('Skeleton A moves closer...'), false);
    assert.equal(logs.includes('Skeleton B moves closer...'), true);
    assert.equal(playerReadyCount, 1);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('BattleTurnController immediately re-enables player actions on player turn', () => {
  const player = new Player();
  const enemy = new Skeleton(2, 'Skeleton A');
  const turnManager = new TurnManager();
  turnManager.initializeTurns([player, enemy]);

  const logs = [];
  let buttonsEnabled = false;
  let playerReadyCount = 0;
  const battleTurnController = new BattleTurnController(
    {
      isInAttackRange: () => false,
      moveEntityToward: () => {},
    },
    turnManager,
    player,
    {
      onAddBattleLog: (message) => logs.push(message),
      onUpdateHUD: () => {},
      onEnableBattleButtons: (enabled) => { buttonsEnabled = enabled; },
      onBattleEnd: () => {},
      onPlayerTurnReady: () => { playerReadyCount += 1; },
    }
  );

  battleTurnController.processTurn();

  assert.equal(turnManager.isPlayerTurn(), true);
  assert.equal(turnManager.waitingForPlayer, true);
  assert.equal(buttonsEnabled, true);
  assert.equal(playerReadyCount, 1);
  assert.deepEqual(logs, []);
});
