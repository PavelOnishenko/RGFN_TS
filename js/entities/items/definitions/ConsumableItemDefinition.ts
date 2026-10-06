import { ItemData } from '../../ItemDeclarations.js';
import { ConsumableDefinitionConfig, ItemDefinition, ItemTierDefinition } from '../ItemDefinition.js';

export class ConsumableItemDefinition implements ItemDefinition {
    public readonly baseId: string;
    public readonly type = 'consumable' as const;
    public readonly tiers: ItemTierDefinition[];

    constructor(config: ConsumableDefinitionConfig) {
        this.baseId = config.baseId;
        this.tiers = config.tiers;
    }

    public buildTierItem = (tier: ItemTierDefinition): ItemData => ({
        id: this.baseId,
        name: tier.name,
        description: tier.description,
        type: this.type,
        goldValue: tier.goldValue ?? 0,
        findWeight: tier.findWeight ?? 0,
        spriteClass: tier.spriteClass ?? 'unknown-item-sprite',
    });
}
