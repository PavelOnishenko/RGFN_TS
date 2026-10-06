import Skeleton from '../../entities/Skeleton.js';
import Item from '../../entities/Item.js';
import { WeaponEnchantment } from '../../entities/ItemDeclarations.js';

type WeaponEnchantmentCombatResult = {
    damageMultiplier: number;
    flatDamageBonus: number;
    logs: string[];
};

const formatPercent = (value: number): string => `${Math.max(0, Math.min(100, Math.round(value)))}%`;

const rollChance = (chancePercent: number | undefined): boolean => {
    const safe = Math.max(0, Math.min(100, Math.round(chancePercent ?? 0)));
    return Math.random() < (safe / 100);
};

const getAllEnchantments = (weapons: Array<Item | null>): WeaponEnchantment[] =>
    weapons
        .filter((weapon): weapon is Item => weapon !== null)
        .flatMap((weapon) => weapon.enchantments ?? []);

const applyPlasma = (enchantment: WeaponEnchantment, target: Skeleton, state: WeaponEnchantmentCombatResult): void => {
    const bonus = enchantment.plasmaBonusDamage ?? 0;
    if (bonus <= 0) {
        return;
    }
    const delayed = Math.max(1, Math.floor(bonus / 2));
    target.applyDamageOverTime(delayed, 1, 'plasma burn');
    state.logs.push(`Plasma enchantment triggers: +${bonus} hit damage and ${delayed} delayed damage.`);
};

const applyWormhole = (enchantment: WeaponEnchantment, state: WeaponEnchantmentCombatResult): void => {
    if (!rollChance(enchantment.wormholeCritChance)) {
        return;
    }
    state.damageMultiplier *= 2;
    state.logs.push(`Wormhole enchantment triggers: critical hit (${formatPercent(enchantment.wormholeCritChance)} chance).`);
};

const applyConfusion = (enchantment: WeaponEnchantment, target: Skeleton, state: WeaponEnchantmentCombatResult): void => {
    if (!rollChance(enchantment.confusionStunChance)) {
        return;
    }
    target.applyStun(1);
    state.logs.push(`Confusion enchantment triggers: ${target.name} is stunned for 1 turn (${formatPercent(enchantment.confusionStunChance)} chance).`);
};

const applyDoubt = (enchantment: WeaponEnchantment, target: Skeleton, state: WeaponEnchantmentCombatResult): void => {
    const damagePerTurn = enchantment.doubtDamagePerSecond ?? 0;
    const duration = enchantment.doubtDurationSeconds ?? 0;
    if (damagePerTurn > 0 && duration > 0) {
        target.applyDamageOverTime(damagePerTurn, duration, 'doubt');
        state.logs.push(`Doubt enchantment triggers: ${damagePerTurn} damage/turn for ${duration} turns.`);
    }
};

const applySingleEnchantment = (enchantment: WeaponEnchantment, target: Skeleton, state: WeaponEnchantmentCombatResult): void => {
    if (enchantment.type === 'plasma') {
        applyPlasma(enchantment, target, state);
        return;
    }
    if (enchantment.type === 'wormhole') {
        applyWormhole(enchantment, state);
        return;
    }
    if (enchantment.type === 'confusion') {
        applyConfusion(enchantment, target, state);
        return;
    }
    applyDoubt(enchantment, target, state);
};

export const resolveWeaponEnchantmentAttack = (target: Skeleton, weapons: Array<Item | null>): WeaponEnchantmentCombatResult => {
    const logs: string[] = [];
    let damageMultiplier = 1;
    let flatDamageBonus = 0;
    const enchantments = getAllEnchantments(weapons);
    const state: WeaponEnchantmentCombatResult = { damageMultiplier, flatDamageBonus, logs };
    enchantments.forEach((enchantment) => applySingleEnchantment(enchantment, target, state));
    return state;
};
