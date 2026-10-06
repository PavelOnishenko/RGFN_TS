import test from 'node:test';
import assert from 'node:assert/strict';

import Skeleton from '../../dist/entities/Skeleton.js';
import { generateMonsterDirectionalBehaviorCodex } from '../../dist/systems/combat/MonsterBehaviorCodex.js';

test('Skeleton directional behaviors run in sequence and restart with a new behavior', () => {
  const skeleton = new Skeleton(0, 0, { archetypeId: 'skeleton', xpValue: 1, name: 'Test Skeleton', width: 10, height: 10 });
  skeleton.setDirectionalBehaviorPool([
    { id: 'fixed-pattern', weight: 1, moves: ['AttackLeft', 'Block'] },
  ]);

  assert.equal(skeleton.rollDirectionalCombatMove(), 'AttackLeft');
  assert.equal(skeleton.rollDirectionalCombatMove(), 'Block');
  assert.equal(skeleton.rollDirectionalCombatMove(), 'AttackLeft');
});

test('generateMonsterDirectionalBehaviorCodex builds configured amount of behaviors per monster type', () => {
  const codex = generateMonsterDirectionalBehaviorCodex({
    minBehaviorsPerMonsterType: 2,
    maxBehaviorsPerMonsterType: 2,
    minMovesPerBehavior: 1,
    maxMovesPerBehavior: 1,
    behaviorWeightMin: 3,
    behaviorWeightMax: 3,
    monsterMovePools: {
      skeleton: ['AttackCenter'],
      zombie: ['Block'],
    },
  });

  assert.equal(codex.skeleton.length, 2);
  assert.equal(codex.zombie.length, 2);
  assert.deepEqual(codex.skeleton.map((behavior) => behavior.moves), [['AttackCenter'], ['AttackCenter']]);
  assert.deepEqual(codex.zombie.map((behavior) => behavior.moves), [['Block'], ['Block']]);
  assert.deepEqual(codex.skeleton.map((behavior) => behavior.weight), [3, 3]);
});


test('Skeleton directional move roll throws when no behavior pool is assigned (no fallback)', () => {
  const skeleton = new Skeleton(0, 0, { archetypeId: 'skeleton', xpValue: 1, name: 'No Pool Skeleton', width: 10, height: 10 });

  assert.throws(() => skeleton.rollDirectionalCombatMove(), /no directional behavior/i);
});

test('Human archetype entities receive instance-scoped directional behavior pools automatically', () => {
  const wandererA = new Skeleton(0, 0, { archetypeId: 'human', xpValue: 1, name: 'Wanderer Alpha', width: 10, height: 10 });
  const wandererB = new Skeleton(0, 0, { archetypeId: 'human', xpValue: 1, name: 'Wanderer Beta', width: 10, height: 10 });

  const validMoves = new Set(['AttackLeft', 'AttackCenter', 'AttackRight', 'Block', 'DodgeLeft', 'DodgeRight']);
  const firstMoveA = wandererA.rollDirectionalCombatMove();
  const firstMoveB = wandererB.rollDirectionalCombatMove();

  assert.equal(validMoves.has(firstMoveA), true);
  assert.equal(validMoves.has(firstMoveB), true);
});
