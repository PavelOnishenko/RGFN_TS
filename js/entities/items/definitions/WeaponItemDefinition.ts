import { ItemData } from '../../ItemDeclarations.js';
import { ItemDefinition, ItemTierDefinition, WeaponDefinitionConfig, buildTieredItemId } from '../ItemDefinition.js';

export class WeaponItemDefinition implements ItemDefinition {
    public readonly baseId: string;
    public readonly type = 'weapon' as const;
    public readonly tiers: ItemTierDefinition[];

    private readonly handsRequired: 1 | 2;
    private readonly requirements: ItemData['requirements'];
    private readonly isRanged: boolean;
    private readonly attackRange: number;

    constructor(config: WeaponDefinitionConfig) {
        this.baseId = config.baseId;
        this.handsRequired = config.handsRequired;
        this.requirements = config.requirements ?? {};
        this.isRanged = config.isRanged ?? false;
        this.attackRange = config.attackRange ?? 1;
        this.tiers = config.tiers;
    }

    public buildTierItem = (tier: ItemTierDefinition): ItemData => ({
        id: buildTieredItemId(this.baseId, tier.tier),
        name: tier.name,
        description: tier.description,
        type: this.type,
        damageBonus: tier.damageBonus ?? 0,
        handsRequired: this.handsRequired,
        requirements: this.requirements,
        goldValue: tier.goldValue ?? 0,
        findWeight: tier.findWeight ?? 0,
        isRanged: this.isRanged,
        attackRange: tier.attackRange ?? this.attackRange,
        spriteClass: tier.spriteClass ?? `${this.baseId}-t${tier.tier}-sprite`,
    });
}
