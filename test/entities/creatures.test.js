import test from 'node:test';
import assert from 'node:assert/strict';

import Skeleton from '../../dist/entities/Skeleton.js';
import Wanderer from '../../dist/entities/Wanderer.js';
import { balanceConfig } from '../../dist/config/balance/balanceConfig.js';
import { deriveCreatureStats } from '../../dist/config/creatureStats.js';

test('Enemy archetypes derive resulting stats from base stats plus shared skills', () => {
  const zombie = new Skeleton(0, 0, balanceConfig.enemies.zombie);
  const ninja = new Skeleton(0, 0, balanceConfig.enemies.ninja);
  const hpMultiplier = Math.max(0, balanceConfig.enemies.hpMultiplier ?? 1);

  const zombieDerived = deriveCreatureStats(
    balanceConfig.creatureArchetypes.zombie.baseStats,
    balanceConfig.creatureArchetypes.zombie.skills,
  );
  const ninjaDerived = deriveCreatureStats(
    balanceConfig.creatureArchetypes.ninja.baseStats,
    balanceConfig.creatureArchetypes.ninja.skills,
  );

  assert.equal(zombie.baseStats.hp, balanceConfig.creatureArchetypes.zombie.baseStats.hp);
  assert.equal(zombie.skills.vitality, balanceConfig.creatureArchetypes.zombie.skills.vitality);
  assert.equal(zombie.maxHp, Math.round(zombieDerived.maxHp * hpMultiplier));
  assert.equal(zombie.damage, zombieDerived.physicalDamage);

  assert.equal(ninja.maxHp, Math.round(ninjaDerived.maxHp * hpMultiplier));
  assert.equal(ninja.damage, ninjaDerived.physicalDamage);
  assert.equal(ninja.avoidChance > 0, true);
});

test('Wanderers use the human base profile and gain derived stats from their skill rolls', () => {
  const wanderer = new Wanderer(2, []);
  const totalSkills = Object.values(wanderer.skills).reduce((sum, value) => sum + value, 0);

  assert.deepEqual(wanderer.baseStats, balanceConfig.creatureArchetypes.human.baseStats);
  assert.equal(totalSkills, 10);
  assert.equal(wanderer.maxHp >= wanderer.baseStats.hp, true);
  assert.equal(wanderer.maxMana >= wanderer.baseStats.mana, true);
});

test('Mutant traits alter combat profile and trigger retaliation hooks', () => {
  const baseline = new Skeleton(0, 0, balanceConfig.enemies.skeleton);
  const mutant = new Skeleton(0, 0, {
    ...balanceConfig.enemies.skeleton,
    name: 'Torka Kaquin',
    mutations: ['feral strength', 'void armor', 'acid blood', 'barbed hide', 'blink speed', 'grave intellect'],
  });

  assert.equal(mutant.mutations.includes('acid blood'), true);
  assert.equal(mutant.damage >= baseline.damage, true);
  assert.equal(mutant.armor > baseline.armor, true);
  assert.equal(mutant.avoidChance > baseline.avoidChance, true);
  assert.equal(mutant.magicPoints >= baseline.magicPoints, true);

  const retaliation = mutant.onDamagedByPlayer(true);
  assert.equal(retaliation.retaliationDamage >= 2, true);
  assert.equal(retaliation.logs.length >= 2, true);
});
