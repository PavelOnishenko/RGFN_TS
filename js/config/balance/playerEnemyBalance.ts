import { creatureArchetypes } from './creatureArchetypes.js';

export const playerBalance = {
    baseHp: creatureArchetypes.human.baseStats.hp,
    baseDamage: creatureArchetypes.human.baseStats.damage,
    baseArmor: creatureArchetypes.human.baseStats.armor,
    baseMana: creatureArchetypes.human.baseStats.mana,
    initialVitality: 0,
    initialToughness: 0,
    initialStrength: 0,
    initialAgility: 0,
    initialConnection: 0,
    initialIntelligence: 0,
    initialSkillPoints: 500,
    initialGold: 500,
    initialRandomAllocatedSkillPoints: 5,
    width: 32,
    height: 32,
    baseInventorySlots: 4,
    strengthPerInventorySlot: 4,
};

export const enemyBalance = {
    hpMultiplier: 2,
    skeleton: { archetypeId: 'skeleton', hp: 3, damage: 1, xpValue: 3, name: 'Skeleton', width: 30, height: 30 },
    zombie: { archetypeId: 'zombie', hp: 7, damage: 1, xpValue: 5, name: 'Zombie', width: 30, height: 30 },
    ninja: { archetypeId: 'ninja', hp: 5, damage: 3, xpValue: 7, name: 'Ninja', width: 30, height: 30, behavior: { avoidHitChance: 0.5 } },
    darkKnight: { archetypeId: 'darkKnight', hp: 15, damage: 5, xpValue: 12, name: 'Dark Knight', width: 32, height: 32, behavior: { doubleDamageChance: 0.5 }, },
    dragon: { archetypeId: 'dragon', hp: 50, damage: 10, xpValue: 25, name: 'Dragon', width: 40, height: 40, behavior: { passEncounterChance: 0.5 } },
};
