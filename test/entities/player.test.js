import test from 'node:test';
import assert from 'node:assert/strict';

import Player from '../../dist/entities/player/Player.js';
import Item from '../../dist/entities/Item.js';
import { balanceConfig } from '../../dist/config/balance/balanceConfig.js';
import { levelConfig } from '../../dist/config/levelConfig.js';
import { createEmptyNextCharacterRollAllocation } from '../../dist/utils/NextCharacterRollConfig.js';

test('Player initializes with randomized starting allocation and name', () => {
  const player = new Player(0, 0);

  const totalAllocatedStats = player.vitality + player.toughness + player.strength + player.agility + player.connection + player.intelligence;
  assert.equal(totalAllocatedStats, balanceConfig.player.initialRandomAllocatedSkillPoints);
  assert.equal(player.armor >= balanceConfig.player.baseArmor, true);
  assert.equal(player.maxMana >= balanceConfig.player.baseMana, true);
  assert.equal(player.level, 1);
  assert.equal(player.skillPoints, balanceConfig.player.initialSkillPoints);
  assert.equal(typeof player.name, 'string');
  assert.equal(player.name.length > 0, true);
  assert.equal(player.gold, balanceConfig.player.initialGold);
  assert.equal(player.fatigue, 0);
});

test('Player travel fatigue grows from movement and is reduced by sleep recovery', () => {
  const player = new Player(0, 0);
  const startFatigue = player.fatigue;

  player.addTravelFatigue(10);
  assert.equal(player.fatigue > startFatigue, true);

  const beforeRecovery = player.fatigue;
  const recovered = player.recoverFatigue(20);
  assert.equal(recovered > 0, true);
  assert.equal(player.fatigue < beforeRecovery, true);
});

test('Player takeDamage applies armor and minimum damage rule', () => {
  const player = new Player(0, 0);
  player.toughness = 6;
  player.updateStats(); // armor = 2

  player.takeDamage(1);
  assert.equal(player.hp, player.maxHp - 1);

  player.takeDamage(5);
  assert.equal(player.hp, player.maxHp - 4);
});

test('Player addXp levels up, grants skill points and carries overflow XP', () => {
  const player = new Player(0, 0);
  player.hp = 1;

  const leveled = player.addXp(player.xpToNextLevel + 2);

  assert.equal(leveled, true);
  assert.equal(player.level, 2);
  assert.equal(player.skillPoints, balanceConfig.player.initialSkillPoints + levelConfig.skillPointsPerLevel);
  assert.equal(player.xp, 2);
  assert.equal(player.hp, player.maxHp);
  assert.equal(player.mana <= player.maxMana, true);
});

test('Player addStat succeeds only with enough skill points and updates stats', () => {
  const player = new Player(0, 0);
  player.strength = 0;
  player.agility = 0;
  player.updateStats();
  player.skillPoints = 0;

  assert.equal(player.addStat('strength'), false);

  player.skillPoints = 2;
  const success = player.addStat('strength', 2);

  assert.equal(success, true);
  assert.equal(player.strength, 2);
  assert.equal(player.skillPoints, 0);
  assert.equal(player.damage, balanceConfig.combat.fistDamagePerHand * 2 + 2);
});


test('Player applies melee stat bonus per hand when unarmed', () => {
  const player = new Player(0, 0);
  player.strength = 0;
  player.agility = 0;
  player.updateStats();
  player.skillPoints = 6;

  player.addStat('strength', 6);

  assert.equal(player.damage, 8);
});

test('Player keeps full mana state when max mana increases', () => {
  const player = new Player(0, 0);
  player.skillPoints = 1;

  assert.equal(player.mana, player.maxMana);
  const oldMaxMana = player.maxMana;

  player.addStat('connection');

  assert.equal(player.maxMana >= oldMaxMana + 1, true);
  assert.equal(player.mana <= player.maxMana, true);
});

test('Player keeps full HP state when max HP increases from vitality', () => {
  const player = new Player(0, 0);
  player.skillPoints = 2;
  player.hp = player.maxHp;

  const oldMaxHp = player.maxHp;

  player.addStat('vitality', 2);

  assert.equal(player.maxHp >= oldMaxHp + 2, true);
  assert.equal(player.hp, player.maxHp);
});

test('Player can use a configured starting skill roll for the next new character', () => {
  const configuredRoll = createEmptyNextCharacterRollAllocation();
  configuredRoll.intelligence = 3;
  configuredRoll.vitality = 2;

  const player = new Player(0, 0, { startingSkillAllocation: configuredRoll });

  assert.equal(player.intelligence, balanceConfig.player.initialIntelligence + 3);
  assert.equal(player.vitality, balanceConfig.player.initialVitality + 2);
  assert.equal(player.magicPoints, 1);
});

test('Player starts with magic points when initial intelligence is already high enough', () => {
  const originalInitialIntelligence = balanceConfig.player.initialIntelligence;
  const originalInitialRandomAllocatedSkillPoints = balanceConfig.player.initialRandomAllocatedSkillPoints;

  balanceConfig.player.initialIntelligence = 3;
  balanceConfig.player.initialRandomAllocatedSkillPoints = 0;

  try {
    const player = new Player(0, 0);

    assert.equal(player.intelligence, 3);
    assert.equal(player.magicPoints, 1);
    assert.equal(player.maxMana >= balanceConfig.player.baseMana + 1, true);
  } finally {
    balanceConfig.player.initialIntelligence = originalInitialIntelligence;
    balanceConfig.player.initialRandomAllocatedSkillPoints = originalInitialRandomAllocatedSkillPoints;
  }
});

test('Player intelligence grants mana fraction and magic points each 3 points', () => {
  const player = new Player(0, 0);
  player.skillPoints = 3;

  player.addStat('intelligence', 3);

  assert.equal(player.intelligence >= 3, true);
  assert.equal(player.magicPoints >= 1, true);
  assert.equal(player.maxMana >= balanceConfig.player.baseMana + 1, true);
});

test('Player inventory keeps discovered equipment in inventory until explicitly equipped', () => {
  const player = new Player(0, 0);
  const potion = new Item({ id: 'healingPotion', name: 'Potion', description: 'Heal', type: 'consumable' });
  const bow = new Item({ id: 'bow', name: 'Bow', description: 'Ranged', type: 'weapon', attackRange: 3, handsRequired: 2, damageBonus: 2, requirements: { agility: 0, strength: 0 }, isRanged: true });

  player.addItemToInventory(potion);
  assert.equal(player.hasWeapon(), false);
  assert.equal(player.getAttackRange(), 1);

  player.addItemToInventory(bow);
  assert.equal(player.hasWeapon(), false);
  assert.equal(player.getAttackRange(), 1);
  assert.deepEqual(player.getInventory().map((item) => item.id).sort(), ['bow', 'healingPotion']);

  const armor = new Item({ id: 'armor_t1', name: 'Armor +1', description: 'Armor', type: 'armor', effects: { flatArmor: 1 } });
  player.addItemToInventory(armor);
  assert.equal(player.equippedArmor, null);
  assert.deepEqual(player.getInventory().map((item) => item.id).sort(), ['armor_t1', 'bow', 'healingPotion']);
});


test('Player recalculates damage when weapon is equipped while preserving full mana', () => {
  const player = new Player(0, 0);
  player.strength = balanceConfig.player.strengthPerInventorySlot;
  player.agility = 0;
  player.updateStats();
  player.mana = player.maxMana;

  const shortSword = new Item({ id: 'shortSword_5', name: 'Short Sword +5', description: 'One-handed', type: 'weapon', handsRequired: 1, damageBonus: 5, requirements: { agility: 0, strength: 0 } });
  player.equippedWeapon = shortSword;

  assert.equal(player.damage, 10);
  assert.equal(player.mana, player.maxMana);
});



test('Dropped inventory items are removed permanently', () => {
  const player = new Player(0, 0);
  const potion = new Item({ id: 'manaPotion', name: 'Mana Potion', description: 'Restore mana', type: 'consumable' });

  player.addItemToInventory(potion);
  assert.equal(player.getInventory().map((item) => item.id).includes('manaPotion'), true);

  const removed = player.removeInventoryItemAt(0);

  assert.equal(removed?.id, 'manaPotion');
  assert.equal(player.getInventory().map((item) => item.id).includes('manaPotion'), false);
});
test('Equipped items are removed from inventory and return on unequip', () => {
  const player = new Player(0, 0);
  const sword = new Item({ id: 'shortSword_3', name: 'Short Sword +3', description: 'One-handed', type: 'weapon', handsRequired: 1, damageBonus: 3, requirements: { agility: 0, strength: 0 } });
  const shield = new Item({ id: 'buckler_2', name: 'Buckler +2', description: 'Offhand', type: 'weapon', handsRequired: 1, damageBonus: 2, requirements: { agility: 0, strength: 0 } });
  const armor = new Item({ id: 'armor_t2', name: 'Armor +2', description: 'Armor', type: 'armor', effects: { flatArmor: 2 } });

  player.addItemToInventory(sword);
  player.addItemToInventory(shield);
  player.addItemToInventory(armor);

  assert.deepEqual(player.getInventory().map((item) => item.id).sort(), ['armor_t2', 'buckler_2', 'shortSword_3']);

  player.equipWeaponToSlot(sword, 'main');
  player.equipWeaponToSlot(shield, 'offhand');
  player.equippedArmor = armor;

  assert.deepEqual(player.getInventory().map((item) => item.id), []);

  player.unequipWeapon();
  player.unequipOffhandWeapon();
  player.unequipArmor();

  assert.deepEqual(player.getInventory().map((item) => item.id).sort(), ['armor_t2', 'buckler_2', 'shortSword_3']);
});

test('Player exposes equippedOffhandWeapon getter after equipping offhand slot', () => {
  const player = new Player(0, 0);
  const mainKnife = new Item({ id: 'knife_main', name: 'Knife +3', description: 'Main hand', type: 'weapon', handsRequired: 1, damageBonus: 3, requirements: { agility: 0, strength: 0 } });
  const offKnife = new Item({ id: 'knife_off', name: 'Knife +1', description: 'Off hand', type: 'weapon', handsRequired: 1, damageBonus: 1, requirements: { agility: 0, strength: 0 } });

  player.addItemToInventory(mainKnife);
  player.addItemToInventory(offKnife);
  player.equipWeaponToSlot(mainKnife, 'main');
  player.equipWeaponToSlot(offKnife, 'offhand');

  assert.equal(player.equippedMainWeapon, mainKnife);
  assert.equal(player.equippedOffhandWeapon, offKnife);
});


test('Player inventory capacity scales with strength at 4 STR intervals', () => {
  const player = new Player(0, 0);

  const baseSlots = balanceConfig.player.baseInventorySlots;
  const strengthStep = balanceConfig.player.strengthPerInventorySlot;

  assert.equal(player.getInventoryCapacityForStrength(0), baseSlots);
  assert.equal(player.getInventoryCapacityForStrength(strengthStep - 1), baseSlots);
  assert.equal(player.getInventoryCapacityForStrength(strengthStep), baseSlots + 1);
  assert.equal(player.getInventoryCapacityForStrength(strengthStep * 2), baseSlots + 2);
});

test('Player addItemToInventory uses dynamic strength-based capacity', () => {
  const player = new Player(0, 0);
  player.strength = 0;
  player.updateStats();

  for (let index = 0; index < balanceConfig.player.baseInventorySlots; index += 1) {
    const added = player.addItemToInventory(new Item({ id: `potion-${index}`, name: 'Potion', description: 'Heal', type: 'consumable' }));
    assert.equal(added, true);
  }

  const fifthAtZeroStrength = player.addItemToInventory(new Item({ id: 'potion-4', name: 'Potion', description: 'Heal', type: 'consumable' }));
  assert.equal(fifthAtZeroStrength, false);

  player.strength = balanceConfig.player.strengthPerInventorySlot;
  player.updateStats();

  const fifthAtFourStrength = player.addItemToInventory(new Item({ id: 'potion-5', name: 'Potion', description: 'Heal', type: 'consumable' }));
  assert.equal(fifthAtFourStrength, true);
});
