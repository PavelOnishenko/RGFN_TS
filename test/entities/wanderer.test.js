import test from 'node:test';
import assert from 'node:assert/strict';

import Wanderer from '../../dist/entities/Wanderer.js';
import Item from '../../dist/entities/Item.js';

function createArmor(flatArmor) {
  return new Item({ id: `armor_${flatArmor}`, name: 'Armor', description: '', type: 'armor', effects: { flatArmor } });
}

function createWeapon(id, damageBonus, handsRequired = 2) {
  return new Item({ id, name: id, description: '', type: 'weapon', damageBonus, handsRequired, requirements: {} });
}

test('Wanderer awards XP as 3 * level', () => {
  const wanderer = new Wanderer(7, []);
  assert.equal(wanderer.xpValue, 21);
});

test('Wanderer equips best available weapon and armor', () => {
  const inventory = [createWeapon('weak', 2), createWeapon('strong', 5), createArmor(1), createArmor(3)];
  const wanderer = new Wanderer(6, inventory);

  const loot = wanderer.getLootItems();
  assert.equal(loot.length, 4);
  assert.equal(wanderer.getAttackRange(), 1);
  assert.equal(wanderer.damage >= 5, true);
});

test('Wanderer magic points follow intelligence rule', () => {
  const wanderer = new Wanderer(9, []);
  assert.equal(wanderer.magicPoints, Math.floor(wanderer.intelligence / 3));
});

test('Wanderer random levels are mostly below 10', () => {
  const sampleSize = 2000;
  let lowLevels = 0;

  for (let i = 0; i < sampleSize; i++) {
    const level = Wanderer.createRandom().level;
    if (level < 10) {
      lowLevels += 1;
    }
  }

  const ratio = lowLevels / sampleSize;
  assert.equal(ratio > 0.86 && ratio < 0.94, true);
});


test('Wanderer encounter description includes resulting stats so rolls are visible', () => {
  const wanderer = new Wanderer(4, []);
  const description = wanderer.getEncounterDescription();

  assert.equal(description.includes('Base profile:'), true);
  assert.equal(description.includes('Resulting stats:'), true);
  assert.equal(description.includes(`HP ${wanderer.maxHp}`), true);
  assert.equal(description.includes(`DMG ${wanderer.damage}`), true);
});

test('Wanderer one-handed weapon damage includes offhand fist and per-hand stat scaling', () => {
  const inventory = [createWeapon('knife', 4, 1)];
  const wanderer = new Wanderer(1, inventory);

  wanderer.skills.strength = 9;
  wanderer.skills.agility = 10;
  wanderer.skills.vitality = 11;
  wanderer.skills.toughness = 8;
  wanderer.skills.connection = 11;
  wanderer.skills.intelligence = 11;
  wanderer.refreshDerivedStats();

  // melee bonus = floor(9 / 2) + floor(10 / 4) = 6
  // one-handed attack = weapon (4) + weapon stat bonus (6) + offhand fist (1 + 6)
  assert.equal(wanderer.maxHp, 16);
  assert.equal(wanderer.damage, 17);
});
