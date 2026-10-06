/**
 * Level System Configuration
 * Defines XP requirements, stat formulas, and progression
 */

import { balanceConfig } from './balance/balanceConfig.js';

// Re-export for convenience
export const levelConfig = balanceConfig.leveling;

/**
 * Calculate XP required for a given level
 */
export function getXpForLevel(level: number): number {
    if (level <= 1 || level > balanceConfig.leveling.maxLevel) {
        return 0;
    }
    return balanceConfig.leveling.xpRequirements[level - 2] || 0;
}

/**
 * Calculate total XP required to reach a level
 */
export function getTotalXpForLevel(level: number): number {
    let totalXp = 0;
    for (let i = 1; i < level && i < balanceConfig.leveling.maxLevel; i++) {
        totalXp += getXpForLevel(i + 1);
    }
    return totalXp;
}

/**
 * Calculate armor from toughness stat
 */
export const calculateArmor = (toughness: number): number =>
    Math.floor(toughness / balanceConfig.stats.toughnessToArmor);

/**
 * Calculate melee damage bonus from strength and agility stats
 */
export const calculateMeleeDamageBonus = (strength: number, agility: number): number =>
    Math.floor(strength / balanceConfig.stats.strengthToMeleeDamage) +
    Math.floor(agility / balanceConfig.stats.agilityToMeleeDamage);

/**
 * Calculate bow damage bonus from strength and agility stats
 */
export const calculateBowDamageBonus = (strength: number, agility: number): number =>
    Math.floor(strength / balanceConfig.stats.strengthToBowDamage) +
    Math.floor(agility / balanceConfig.stats.agilityToBowDamage);

/**
 * Calculate agility-based avoid chance with diminishing returns
 */
export const calculateAvoidChance = (agility: number): number =>
    Math.min(
        balanceConfig.stats.avoidChanceCap,
        1 - (1 / (1 + agility * balanceConfig.stats.avoidChanceScale)),
    );

/**
 * Calculate max HP from vitality stat
 */
export const calculateMaxHp = (vitality: number): number =>
    balanceConfig.player.baseHp + (vitality * balanceConfig.stats.vitalityToHp);

/**
 * Calculate max mana from connection and intelligence stats.
 * Connection gives 1 mana each.
 * Intelligence gives 1/3 mana each.
 */
export const calculateMana = (connection: number, intelligence: number): number =>
    balanceConfig.player.baseMana + Math.floor(
        connection * balanceConfig.stats.connectionToMana +
        intelligence / balanceConfig.stats.intelligenceToManaDivisor,
    );

/**
 * Calculate total melee damage from strength/agility stats
 */
export const calculateTotalMeleeDamage = (strength: number, agility: number): number =>
    balanceConfig.player.baseDamage + calculateMeleeDamageBonus(strength, agility);
