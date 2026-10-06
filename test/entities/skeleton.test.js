import test from 'node:test';
import assert from 'node:assert/strict';

import Skeleton from '../../dist/entities/Skeleton.js';
import { balanceConfig } from '../../dist/config/balance/balanceConfig.js';
import { createMockCanvasContext } from '../helpers/testUtils.js';

function createEnemyWithBehavior(baseConfig, behavior) {
  return new Skeleton(0, 0, {
    ...baseConfig,
    behavior: {
      ...(baseConfig.behavior ?? {}),
      ...behavior,
    },
  });
}

test('Skeleton initializes from config and deactivates on death', () => {
  const skeleton = new Skeleton(0, 0, balanceConfig.enemies.zombie);

  assert.equal(skeleton.name, 'Zombie');
  assert.equal(skeleton.hp, Math.round(balanceConfig.enemies.zombie.hp * balanceConfig.enemies.hpMultiplier));

  const died = skeleton.takeDamage(999);
  assert.equal(died, true);
  assert.equal(skeleton.active, false);
});

test('Skeleton behavior checks follow configured avoid/damage/pass semantics', () => {
  const ninjaAlwaysAvoids = createEnemyWithBehavior(balanceConfig.enemies.ninja, { avoidHitChance: 1 });
  const ninjaNeverAvoids = createEnemyWithBehavior(balanceConfig.enemies.ninja, { avoidHitChance: 0 });
  ninjaNeverAvoids.avoidChance = 0;

  const knightAlwaysCrits = createEnemyWithBehavior(balanceConfig.enemies.darkKnight, { doubleDamageChance: 1 });
  const knightNeverCrits = createEnemyWithBehavior(balanceConfig.enemies.darkKnight, { doubleDamageChance: 0 });

  const dragonAlwaysPasses = createEnemyWithBehavior(balanceConfig.enemies.dragon, { passEncounterChance: 1 });

  assert.equal(ninjaAlwaysAvoids.shouldAvoidHit(), true);
  assert.equal(ninjaNeverAvoids.shouldAvoidHit(), false);
  assert.equal(knightAlwaysCrits.getAttackDamage(), knightAlwaysCrits.damage * 2);
  assert.equal(knightNeverCrits.getAttackDamage(), knightNeverCrits.damage);
  assert.equal(dragonAlwaysPasses.shouldPassEncounter(), true);
});

test('Skeleton draw executes correct branch and health bar drawing', () => {
  const ctx = createMockCanvasContext();
  const skeleton = new Skeleton(48, 48, balanceConfig.enemies.darkKnight);

  skeleton.draw(ctx);

  const fillRectCalls = ctx.calls.filter(c => c[0] === 'fillRect');
  assert.ok(fillRectCalls.length >= 4);
});
