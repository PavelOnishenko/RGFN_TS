import test from 'node:test';
import assert from 'node:assert/strict';

import TurnManager from '../../dist/systems/combat/TurnManager.js';
import { createCombatEntity } from '../helpers/testUtils.js';

test('TurnManager initializes turns with only active living entities', () => {
  const tm = new TurnManager();
  const player = createCombatEntity('Player', 1, 1, false);
  const deadEnemy = { ...createCombatEntity('Skeleton', 2, 1, false), isDead: () => true };

  tm.initializeTurns([player, deadEnemy]);

  assert.equal(tm.getCurrentEntity(), player);
  assert.equal(tm.isPlayerTurn(), true);
});

test('TurnManager advances turns and tracks waitingForPlayer', () => {
  const tm = new TurnManager();
  const player = createCombatEntity('Player', 1, 1, false);
  const enemy = createCombatEntity('Skeleton', 2, 1, false);

  tm.initializeTurns([player, enemy]);
  const current = tm.nextTurn();

  assert.equal(current, enemy);
  assert.equal(tm.waitingForPlayer, false);

  tm.nextTurn();
  assert.equal(tm.waitingForPlayer, true);
});

test('TurnManager reports active combatants and enemies', () => {
  const tm = new TurnManager();
  const player = createCombatEntity('Player', 1, 1, false);
  const enemyA = createCombatEntity('Skeleton', 2, 1, false);
  const enemyB = createCombatEntity('Zombie', 3, 1, true);

  tm.initializeTurns([player, enemyA, enemyB]);

  assert.equal(tm.hasActiveCombatants(), true);
  assert.equal(tm.getActiveEnemies().length, 1);
});

test('TurnManager can consume multiple upcoming turns for one entity', () => {
  const tm = new TurnManager();
  const player = createCombatEntity('Player', 1, 1, false);
  const enemy = createCombatEntity('Skeleton', 2, 1, false);

  tm.initializeTurns([player, enemy]);
  tm.consumeUpcomingTurns(player, 2);

  tm.nextTurn();
  assert.equal(tm.getCurrentEntity(), enemy);
  assert.equal(tm.shouldSkipCurrentTurn(), false);

  tm.nextTurn();
  assert.equal(tm.getCurrentEntity(), player);
  assert.equal(tm.shouldSkipCurrentTurn(), true);
  tm.clearCurrentTurnConsumption();
  assert.equal(tm.shouldSkipCurrentTurn(), true);

  tm.clearCurrentTurnConsumption();
  assert.equal(tm.shouldSkipCurrentTurn(), false);
});
