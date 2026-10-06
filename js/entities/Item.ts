/**
 * Item - Represents items that can be discovered and equipped by the player
 */

import type {
    EquipmentHands,
    ItemData,
    ItemEffects,
    ItemRequirements,
    WeaponEnchantment,
} from './ItemDeclarations.js';
import { getAllItemData, getDiscoverableItemData, getItemDataById } from './items/ItemRegistry.js';

export type { ItemId } from './ItemDeclarations.js';
export type {
    EquipmentHands,
    ItemData,
    ItemEffects,
    ItemRequirements,
    WeaponEnchantment,
} from './ItemDeclarations.js';

export default class Item {
    public id: string;
    public name: string;
    public description: string;
    public type: 'weapon' | 'armor' | 'consumable' | 'quest' | 'misc';
    public attackRange: number;
    public handsRequired: EquipmentHands;
    public damageBonus: number;
    public requirements: ItemRequirements;
    public goldValue: number;
    public findWeight: number;
    public isRanged: boolean;
    public spriteClass: string;
    public effects: ItemEffects;
    public enchantments: WeaponEnchantment[];

    constructor(data: ItemData) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.type = data.type;
        this.attackRange = data.attackRange ?? 1;
        this.handsRequired = data.handsRequired ?? 1;
        this.damageBonus = data.damageBonus ?? 0;
        this.requirements = data.requirements ?? {};
        this.goldValue = data.goldValue ?? 0;
        this.findWeight = data.findWeight ?? 0;
        this.isRanged = data.isRanged ?? false;
        this.spriteClass = data.spriteClass ?? 'unknown-item-sprite';
        this.effects = data.effects ?? {};
        this.enchantments = Array.isArray(data.enchantments) ? data.enchantments.map((enchantment) => ({ ...enchantment })) : [];
    }

    public getPlasmaBonusDamage = (): number =>
        this.enchantments
            .filter((enchantment) => enchantment.type === 'plasma')
            .reduce((sum, enchantment) => sum + (enchantment.plasmaBonusDamage ?? 0), 0);

    public toItemData = (): ItemData => ({
        id: this.id,
        name: this.name,
        description: this.description,
        type: this.type,
        attackRange: this.attackRange,
        handsRequired: this.handsRequired,
        damageBonus: this.damageBonus,
        requirements: { ...this.requirements },
        goldValue: this.goldValue,
        findWeight: this.findWeight,
        isRanged: this.isRanged,
        spriteClass: this.spriteClass,
        effects: { ...this.effects },
        enchantments: this.enchantments.map((enchantment) => ({ ...enchantment })),
    });
}

export const ITEM_LIBRARY: ItemData[] = getAllItemData();

export const DISCOVERABLE_ITEM_LIBRARY: ItemData[] = getDiscoverableItemData();

export const HEALING_POTION_ITEM: ItemData = getItemDataById('healingPotion') ?? {
    id: 'healingPotion', name: 'Healing Potion', description: 'A restorative potion that heals 5 HP when used', type: 'consumable', goldValue: 4,
    spriteClass: 'potion-sprite',
};

export const MANA_POTION_ITEM: ItemData = getItemDataById('manaPotion') ?? {
    id: 'manaPotion', name: 'Mana Potion', description: 'A restorative potion that recovers mana when used', type: 'consumable',
};

export function createItemById(id: string): Item | null {
    const data = getItemDataById(id);
    if (!data) {
        return null;
    }

    return new Item(data);
}
