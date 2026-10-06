export type ItemId = string;

export type EquipmentHands = 1 | 2;

export type ItemType = 'weapon' | 'armor' | 'consumable' | 'quest' | 'misc';

export interface ItemRequirements {
    agility?: number;
    strength?: number;
}

export interface ItemEffects {
    flatArmor?: number;
    damageReductionPercent?: number;
    maxAbsorbHp?: number;
}

export type WeaponEnchantmentType = 'plasma' | 'wormhole' | 'confusion' | 'doubt';

export type WeaponEnchantment = {
    type: WeaponEnchantmentType;
    plasmaBonusDamage?: number;
    wormholeCritChance?: number;
    confusionStunChance?: number;
    doubtDamagePerSecond?: number;
    doubtDurationSeconds?: number;
};

export interface ItemData {
    id: string;
    name: string;
    description: string;
    type: ItemType;
    attackRange?: number;
    handsRequired?: EquipmentHands;
    damageBonus?: number;
    requirements?: ItemRequirements;
    goldValue?: number;
    findWeight?: number;
    isRanged?: boolean;
    spriteClass?: string;
    effects?: ItemEffects;
    enchantments?: WeaponEnchantment[];
}
