import { ItemData } from '../ItemDeclarations.js';
import { flattenItemDefinitions, ItemDefinition } from './ItemDefinition.js';
import { ArmorItemDefinition } from './definitions/ArmorItemDefinition.js';
import { ConsumableItemDefinition } from './definitions/ConsumableItemDefinition.js';
import { WeaponItemDefinition } from './definitions/WeaponItemDefinition.js';

const itemRegistry: ItemDefinition[] = [
    new ConsumableItemDefinition({
        baseId: 'healingPotion',
        tiers: [{ tier: 1, name: 'Healing Potion', description: 'A restorative potion that heals 5 HP when used', goldValue: 4, spriteClass: 'potion-sprite' }],
    }),
    new ConsumableItemDefinition({
        baseId: 'manaPotion',
        tiers: [{ tier: 1, name: 'Mana Potion', description: 'A restorative potion that recovers mana when used' }],
    }),
    new WeaponItemDefinition({
        baseId: 'knife',
        handsRequired: 1,
        requirements: { agility: 2 },
        tiers: [1, 2, 3, 4].map((tier, index) => ({
            tier,
            name: `Knife +${index + 1}`,
            description: `One-handed weapon (+${index + 1} damage)`,
            damageBonus: index + 1,
            goldValue: 2,
            findWeight: 10,
        })),
    }),
    new WeaponItemDefinition({
        baseId: 'shortSword',
        handsRequired: 1,
        requirements: { agility: 4, strength: 2 },
        tiers: [2, 3, 4, 5].map((damageBonus, index) => ({
            tier: index + 1,
            name: `Short Sword +${damageBonus}`,
            description: `One-handed weapon (+${damageBonus} damage)`,
            damageBonus,
            goldValue: 5,
            findWeight: 9,
        })),
    }),
    new WeaponItemDefinition({
        baseId: 'axe',
        handsRequired: 1,
        requirements: { agility: 4, strength: 6 },
        tiers: [3, 4, 5, 6].map((damageBonus, index) => ({
            tier: index + 1,
            name: `Axe +${damageBonus}`,
            description: `One-handed weapon (+${damageBonus} damage)`,
            damageBonus,
            goldValue: 7,
            findWeight: 7,
        })),
    }),
    new WeaponItemDefinition({
        baseId: 'twoHandedSword',
        handsRequired: 2,
        requirements: { agility: 4, strength: 12 },
        tiers: [9, 11, 13, 14].map((damageBonus, index) => ({
            tier: index + 1,
            name: `Two-Handed Sword +${damageBonus}`,
            description: `Two-handed weapon (+${damageBonus} damage)`,
            damageBonus,
            goldValue: 18,
            findWeight: 5,
        })),
    }),
    new WeaponItemDefinition({
        baseId: 'bow',
        handsRequired: 2,
        requirements: { agility: 8, strength: 2 },
        isRanged: true,
        attackRange: 2,
        tiers: [1, 2, 3, 4].map((damageBonus, index) => ({
            tier: index + 1,
            name: `Bow +${damageBonus}`,
            description: `Two-handed weapon (+${damageBonus} damage)`,
            damageBonus,
            goldValue: 12,
            findWeight: 3,
        })),
    }),
    new WeaponItemDefinition({
        baseId: 'crossbow',
        handsRequired: 2,
        requirements: { agility: 10, strength: 6 },
        isRanged: true,
        attackRange: 3,
        tiers: [3, 4, 5, 6].map((damageBonus, index) => ({
            tier: index + 1,
            name: `Crossbow +${damageBonus}`,
            description: `Two-handed weapon (+${damageBonus} damage)`,
            damageBonus,
            goldValue: 20,
            findWeight: 2,
        })),
    }),
    new ArmorItemDefinition({
        baseId: 'armor',
        tiers: [
            { tier: 1, name: 'Armor +1', description: '+1 armor', effects: { flatArmor: 1 }, findWeight: 1, goldValue: 12, spriteClass: 'armor-t1-sprite' },
            {
                tier: 2,
                name: 'Armor +1 Guarded',
                description: '+1 armor and 20% damage decrease',
                effects: { flatArmor: 1, damageReductionPercent: 0.2 },
                findWeight: 1,
                goldValue: 16,
                spriteClass: 'armor-t2-sprite',
            },
            {
                tier: 3,
                name: 'Armor +2 Fragile',
                description: '+2 armor, but can only absorb 20 HP',
                effects: { flatArmor: 2, maxAbsorbHp: 20 },
                findWeight: 1,
                goldValue: 18,
                spriteClass: 'armor-t3-sprite',
            },
            {
                tier: 4,
                name: 'Armor Bulwark',
                description: '50% damage decrease, can only absorb 20 HP',
                effects: { damageReductionPercent: 0.5, maxAbsorbHp: 20 },
                findWeight: 1,
                goldValue: 20,
                spriteClass: 'armor-t4-sprite',
            },
        ],
    }),
];

const allItems = flattenItemDefinitions(itemRegistry);
const itemById = new Map(allItems.map((item) => [item.id, item] as const));

export const getItemDefinitions = (): ItemDefinition[] => itemRegistry.map((definition) => definition);

export const getAllItemData = (): ItemData[] => allItems.map((item) => item);

export const getDiscoverableItemData = (): ItemData[] => getAllItemData();

export const getItemDataById = (id: string): ItemData | null => itemById.get(id) ?? null;
