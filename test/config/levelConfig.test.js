import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getXpForLevel,
  getTotalXpForLevel,
  calculateArmor,
  calculateMeleeDamageBonus,
  calculateMaxHp,
  calculateTotalMeleeDamage,
  levelConfig,
} from '../../dist/config/levelConfig.js';
import { balanceConfig } from '../../dist/config/balance/balanceConfig.js';

test('getXpForLevel handles boundaries and valid level', () => {
  assert.equal(getXpForLevel(1), 0);
  assert.equal(getXpForLevel(2), 5);
  assert.equal(getXpForLevel(levelConfig.maxLevel + 1), 0);
});

test('getTotalXpForLevel sums all previous levels', () => {
  assert.equal(getTotalXpForLevel(1), 0);
  assert.equal(getTotalXpForLevel(4), 26);
});

test('stat conversion formulas use balance config rates', () => {
  assert.equal(calculateArmor(8), Math.floor(8 / balanceConfig.stats.toughnessToArmor));
  assert.equal(
    calculateMeleeDamageBonus(5, 0),
    Math.floor(5 / balanceConfig.stats.strengthToMeleeDamage),
  );
  assert.equal(calculateMaxHp(6), balanceConfig.player.baseHp + 6 * balanceConfig.stats.vitalityToHp);
  assert.equal(
    calculateTotalMeleeDamage(5, 0),
    balanceConfig.player.baseDamage + calculateMeleeDamageBonus(5, 0),
  );
});
