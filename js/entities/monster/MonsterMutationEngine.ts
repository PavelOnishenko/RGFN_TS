import type { EnemyBehavior, MonsterMutationTrait } from '../Skeleton.js';

interface MonsterMutationTarget {
    damage: number;
    armor: number;
    avoidChance: number;
    magicPoints: number;
    maxMana: number;
    mana: number;
    behavior: EnemyBehavior;
    mutations: MonsterMutationTrait[];
}

export class MonsterMutationEngine {
    public static applyMutations(entity: MonsterMutationTarget): void {
        if (entity.mutations.includes('feral strength')) {
            entity.damage = Math.max(1, Math.round(entity.damage * 1.35));
        }

        if (entity.mutations.includes('void armor')) {
            entity.armor += 3;
        }

        if (entity.mutations.includes('blink speed')) {
            entity.avoidChance = Math.min(0.8, entity.avoidChance + 0.12);
        }

        if (entity.mutations.includes('grave intellect')) {
            entity.magicPoints += 3;
            entity.maxMana += 8;
            entity.mana = entity.maxMana;
            entity.behavior.doubleDamageChance = Math.max(entity.behavior.doubleDamageChance ?? 0, 0.12);
        }
    }

    public static shouldAvoidHit(behaviorChance: number, avoidChance: number): boolean {
        const totalChance = Math.min(0.95, behaviorChance + avoidChance);
        return totalChance > 0 && Math.random() < totalChance;
    }

    public static getAttackDamage(baseDamage: number, doubleDamageChance: number): number {
        if (doubleDamageChance > 0 && Math.random() < doubleDamageChance) {
            return baseDamage * 2;
        }

        return baseDamage;
    }

    public static shouldPassEncounter = (passEncounterChance: number): boolean => passEncounterChance > 0 && Math.random() < passEncounterChance;

    public static onDamagedByPlayer(name: string, mutations: MonsterMutationTrait[], isMelee: boolean): { retaliationDamage: number; logs: string[] } {
        const logs: string[] = [];
        let retaliationDamage = 0;
        if (mutations.includes('acid blood')) {
            retaliationDamage += 1;
            logs.push(`${name}'s acid blood splashes back for 1 damage.`);
        }

        if (isMelee && mutations.includes('barbed hide')) {
            retaliationDamage += 1;
            logs.push(`${name}'s barbed hide cuts the attacker for 1 damage.`);
        }

        return { retaliationDamage, logs };
    }
}
