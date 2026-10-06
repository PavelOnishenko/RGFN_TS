import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDirectionalCombatExchange } from '../../dist/systems/combat/DirectionalCombat.js';

test('same-lane attacks deal full damage to both combatants', () => {
  const result = resolveDirectionalCombatExchange({
    actorName: 'Player',
    opponentName: 'Skeleton',
    actorMove: 'AttackLeft',
    opponentMove: 'AttackLeft',
    actorBaseDamage: 10,
    opponentBaseDamage: 4,
    actorBuffs: { hasBlockAdvantage: false, hasSuccessfulDodgeMultiplier: false, successfulDodgeMultiplier: 1 },
    opponentBuffs: { hasBlockAdvantage: false, hasSuccessfulDodgeMultiplier: false, successfulDodgeMultiplier: 1 },
  });

  assert.equal(result.actor.damageDealt, 10);
  assert.equal(result.opponent.damageDealt, 4);
});

test('adjacent-lane attacks use the configurable penalty unless block advantage removes it', () => {
  const result = resolveDirectionalCombatExchange({
    actorName: 'Player',
    opponentName: 'Skeleton',
    actorMove: 'AttackLeft',
    opponentMove: 'AttackCenter',
    actorBaseDamage: 10,
    opponentBaseDamage: 10,
    actorBuffs: { hasBlockAdvantage: true, hasSuccessfulDodgeMultiplier: false, successfulDodgeMultiplier: 1 },
    opponentBuffs: { hasBlockAdvantage: false, hasSuccessfulDodgeMultiplier: false, successfulDodgeMultiplier: 1 },
  });

  assert.equal(result.actor.damageDealt, 10);
  assert.equal(result.opponent.damageDealt, 6);
});

test('opposite-lane attacks both miss', () => {
  const result = resolveDirectionalCombatExchange({
    actorName: 'Player',
    opponentName: 'Skeleton',
    actorMove: 'AttackLeft',
    opponentMove: 'AttackRight',
    actorBaseDamage: 10,
    opponentBaseDamage: 10,
    actorBuffs: { hasBlockAdvantage: false, hasSuccessfulDodgeMultiplier: false, successfulDodgeMultiplier: 1 },
    opponentBuffs: { hasBlockAdvantage: false, hasSuccessfulDodgeMultiplier: false, successfulDodgeMultiplier: 1 },
  });

  assert.equal(result.actor.damageDealt, 0);
  assert.equal(result.opponent.damageDealt, 0);
});

test('block reduces damage and grants block advantage', () => {
  const result = resolveDirectionalCombatExchange({
    actorName: 'Player',
    opponentName: 'Skeleton',
    actorMove: 'AttackCenter',
    opponentMove: 'Block',
    actorBaseDamage: 10,
    opponentBaseDamage: 4,
    actorBuffs: { hasBlockAdvantage: false, hasSuccessfulDodgeMultiplier: false, successfulDodgeMultiplier: 1 },
    opponentBuffs: { hasBlockAdvantage: false, hasSuccessfulDodgeMultiplier: false, successfulDodgeMultiplier: 1 },
  });

  assert.equal(result.actor.damageDealt, 5);
  assert.equal(result.opponentRewards.blockAdvantage, true);
});

test('successful dodge avoids damage and grants multiplier reward', () => {
  const result = resolveDirectionalCombatExchange({
    actorName: 'Player',
    opponentName: 'Skeleton',
    actorMove: 'AttackCenter',
    opponentMove: 'DodgeLeft',
    actorBaseDamage: 10,
    opponentBaseDamage: 4,
    actorBuffs: { hasBlockAdvantage: false, hasSuccessfulDodgeMultiplier: false, successfulDodgeMultiplier: 1 },
    opponentBuffs: { hasBlockAdvantage: false, hasSuccessfulDodgeMultiplier: false, successfulDodgeMultiplier: 1 },
  });

  assert.equal(result.actor.damageDealt, 0);
  assert.equal(result.opponentRewards.successfulDodgeMultiplier, 1.5);
});
