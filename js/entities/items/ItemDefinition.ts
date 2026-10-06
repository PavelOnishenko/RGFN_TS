import { EquipmentHands, ItemData, ItemEffects, ItemRequirements } from '../ItemDeclarations.js';

export type ItemType = ItemData['type'];

export type ItemTierDefinition = {
    tier: number;
    name: string;
    description: string;
    goldValue?: number;
    findWeight?: number;
    damageBonus?: number;
    attackRange?: number;
    spriteClass?: string;
    effects?: ItemEffects;
};

export interface ItemDefinition {
    readonly baseId: string;
    readonly type: ItemType;
    readonly tiers: ItemTierDefinition[];
    buildTierItem(tier: ItemTierDefinition): ItemData;
}

export type WeaponDefinitionConfig = {
    baseId: string;
    handsRequired: EquipmentHands;
    requirements?: ItemRequirements;
    isRanged?: boolean;
    attackRange?: number;
    tiers: ItemTierDefinition[];
};

export type ArmorDefinitionConfig = {
    baseId: string;
    tiers: ItemTierDefinition[];
};

export type ConsumableDefinitionConfig = {
    baseId: string;
    tiers: ItemTierDefinition[];
};

export const buildTieredItemId = (baseId: string, tier: number): string => `${baseId}_t${tier}`;

export const flattenItemDefinitions = (definitions: ItemDefinition[]): ItemData[] =>
    definitions.flatMap((definition) => definition.tiers.map((tier) => definition.buildTierItem(tier)));
