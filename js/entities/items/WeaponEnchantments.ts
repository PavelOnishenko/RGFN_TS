import { balanceConfig } from '../../config/balance/balanceConfig.js';
import Item, { DISCOVERABLE_ITEM_LIBRARY } from '../Item.js';
import { WeaponEnchantment, WeaponEnchantmentType } from '../ItemDeclarations.js';

const ENCHANTMENT_POOL: WeaponEnchantmentType[] = ['plasma', 'wormhole', 'confusion', 'doubt'];

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const randomIntInclusive = (min: number, max: number): number => {
    const safeMin = Math.min(min, max);
    const safeMax = Math.max(min, max);
    return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
};

const formatPercent = (value: number): string => `${clampPercent(value)}%`;

const formatEnchantmentName = (type: WeaponEnchantmentType): string => {
    switch (type) {
        case 'plasma':
            return 'Plasma';
        case 'wormhole':
            return 'Wormhole';
        case 'confusion':
            return 'Confusion';
        case 'doubt':
            return 'Doubt';
        default:
            return type;
    }
};

const createRandomEnchantment = (type: WeaponEnchantmentType): WeaponEnchantment => {
    const config = balanceConfig.items.enchantments;
    if (type === 'plasma') {
        return { type, plasmaBonusDamage: randomIntInclusive(config.plasma.minBonusDamage, config.plasma.maxBonusDamage) };
    }
    if (type === 'wormhole') {
        return { type, wormholeCritChance: clampPercent(randomIntInclusive(config.wormhole.minCritChance, config.wormhole.maxCritChance)) };
    }
    if (type === 'confusion') {
        return { type, confusionStunChance: clampPercent(randomIntInclusive(config.confusion.minStunChance, config.confusion.maxStunChance)) };
    }

    return {
        type,
        doubtDamagePerSecond: randomIntInclusive(config.doubt.minDamagePerSecond, config.doubt.maxDamagePerSecond),
        doubtDurationSeconds: randomIntInclusive(config.doubt.minDurationSeconds, config.doubt.maxDurationSeconds),
    };
};

export const getEnchantmentScore = (enchantment: WeaponEnchantment): number => {
    if (enchantment.type === 'plasma') {
        const bonus = enchantment.plasmaBonusDamage ?? 0;
        return bonus * 1.5;
    }
    if (enchantment.type === 'wormhole') {
        const critChance = clampPercent(enchantment.wormholeCritChance ?? 0);
        return (critChance / 100) * 4;
    }
    if (enchantment.type === 'confusion') {
        const stunChance = clampPercent(enchantment.confusionStunChance ?? 0);
        return (stunChance / 100) * 3;
    }
    const dps = enchantment.doubtDamagePerSecond ?? 0;
    const duration = enchantment.doubtDurationSeconds ?? 0;
    return dps * duration * 0.75;
};

const getItemEnchantmentScore = (enchantments: WeaponEnchantment[]): number =>
    enchantments.reduce((sum, enchantment) => sum + getEnchantmentScore(enchantment), 0);

const buildEnchantmentDescriptionLine = (enchantment: WeaponEnchantment): string => {
    if (enchantment.type === 'plasma') {
        const bonus = enchantment.plasmaBonusDamage ?? 0;
        const delayed = Math.max(1, Math.floor(bonus / 2));
        return `Plasma: +${bonus} damage and +${delayed} delayed damage on next turn.`;
    }
    if (enchantment.type === 'wormhole') {
        return `Wormhole: ${formatPercent(enchantment.wormholeCritChance ?? 0)} chance to crit for 2x damage.`;
    }
    if (enchantment.type === 'confusion') {
        return `Confusion: ${formatPercent(enchantment.confusionStunChance ?? 0)} chance to stun target for 1 turn.`;
    }
    return `Doubt: +${enchantment.doubtDamagePerSecond ?? 0} damage/turn for ${enchantment.doubtDurationSeconds ?? 0} turns.`;
};

export const buildEnchantmentDetailLine = (enchantment: WeaponEnchantment): string => {
    if (enchantment.type === 'plasma') {
        const bonus = enchantment.plasmaBonusDamage ?? 0;
        const delayed = Math.max(1, Math.floor(bonus / 2));
        return `Plasma → +${bonus} hit damage, +${delayed} delayed damage on next turn.`;
    }
    if (enchantment.type === 'wormhole') {
        return `Wormhole → ${formatPercent(enchantment.wormholeCritChance ?? 0)} crit chance, 2x damage on proc.`;
    }
    if (enchantment.type === 'confusion') {
        return `Confusion → ${formatPercent(enchantment.confusionStunChance ?? 0)} chance to stun for 1 turn.`;
    }
    return `Doubt → ${enchantment.doubtDamagePerSecond ?? 0} damage per turn for ${enchantment.doubtDurationSeconds ?? 0} turns.`;
};

const buildEnchantedName = (baseName: string, enchantments: WeaponEnchantment[]): string => {
    const prefixes = enchantments.slice(0, 2).map((enchantment) => formatEnchantmentName(enchantment.type));
    return `${prefixes.join('-')} ${baseName}`;
};

const applyEnchantmentsToItem = (item: Item, enchantments: WeaponEnchantment[]): Item => {
    if (enchantments.length === 0) {
        return item;
    }

    const score = getItemEnchantmentScore(enchantments);
    const priceMultiplier = 1 + (score * balanceConfig.items.enchantments.priceMultiplierPerScore);
    item.enchantments = enchantments;
    item.name = buildEnchantedName(item.name, enchantments);
    item.goldValue = Math.max(item.goldValue + enchantments.length, Math.ceil(item.goldValue * priceMultiplier));
    item.description = `${item.description} Enchantments: ${enchantments.map((enchantment) => buildEnchantmentDescriptionLine(enchantment)).join(' ')}`;
    return item;
};

const rollEnchantmentList = (): WeaponEnchantment[] => {
    const config = balanceConfig.items.enchantments;
    const pool = [...ENCHANTMENT_POOL];
    const enchantments: WeaponEnchantment[] = [];
    const maxEnchantments = Math.max(1, config.maxEnchantmentsPerWeapon);
    while (pool.length > 0 && enchantments.length < maxEnchantments) {
        if (enchantments.length > 0 && Math.random() >= config.chanceForExtraEnchantment) {
            break;
        }
        const index = Math.floor(Math.random() * pool.length);
        const [selected] = pool.splice(index, 1);
        if (!selected) {
            break;
        }
        enchantments.push(createRandomEnchantment(selected));
    }
    return enchantments;
};

export const rollRandomWeaponEnchantments = (item: Item, forceEnchanted: boolean = false): Item => {
    if (item.type !== 'weapon') {
        return item;
    }

    const config = balanceConfig.items.enchantments;
    if (!forceEnchanted && Math.random() >= config.chanceOnRandomWeapon) {
        item.enchantments = [];
        return item;
    }
    return applyEnchantmentsToItem(item, rollEnchantmentList());
};

export const buildRandomDiscoverableWeapon = (): Item | null => {
    const weaponPool = DISCOVERABLE_ITEM_LIBRARY.filter((itemData) => itemData.type === 'weapon');
    if (weaponPool.length === 0) {
        return null;
    }

    const selected = weaponPool[Math.floor(Math.random() * weaponPool.length)];
    if (!selected) {
        return null;
    }

    return rollRandomWeaponEnchantments(new Item(selected), true);
};

export const applyRandomEnchantmentsToGeneratedItem = (item: Item): Item => rollRandomWeaponEnchantments(item, false);
