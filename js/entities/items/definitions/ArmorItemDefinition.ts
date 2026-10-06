import { ItemData } from '../../ItemDeclarations.js';
import { ArmorDefinitionConfig, ItemDefinition, ItemTierDefinition, buildTieredItemId } from '../ItemDefinition.js';

export class ArmorItemDefinition implements ItemDefinition {
    public readonly baseId: string;
    public readonly type = 'armor' as const;
    public readonly tiers: ItemTierDefinition[];

    constructor(config: ArmorDefinitionConfig) {
        this.baseId = config.baseId;
        this.tiers = config.tiers;
    }

    public buildTierItem = (tier: ItemTierDefinition): ItemData => ({
        id: buildTieredItemId(this.baseId, tier.tier),
        name: tier.name,
        description: tier.description,
        type: this.type,
        effects: tier.effects,
        goldValue: tier.goldValue ?? 0,
        findWeight: tier.findWeight ?? 0,
        spriteClass: tier.spriteClass ?? `${this.baseId}-t${tier.tier}-sprite`,
    });
}
