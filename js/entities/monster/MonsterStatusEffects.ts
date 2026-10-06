import { balanceConfig } from '../../config/balance/balanceConfig.js';
import { CombatBuffSnapshot, CombatStatusState } from '../../systems/combat/DirectionalCombat.js';

export class MonsterStatusEffects {
    private cursedArmorReduction: number = 0;
    private curseTurns: number = 0;
    private slowTurns: number = 0;
    private stunTurns: number = 0;
    private damageOverTimeEffects: Array<{ damagePerTurn: number; turnsRemaining: number; sourceLabel: string }> = [];
    private blockAdvantage: boolean = false;
    private successfulDodgeMultiplier: number | null = null;

    public calculatePhysicalDamage(amount: number, armor: number): number {
        const effectiveArmor = Math.max(0, armor - this.cursedArmorReduction);
        if (amount <= 0) {
            return 0;
        }

        const minDamage = balanceConfig.combat.minDamageAfterArmor;
        return Math.max(minDamage, amount - effectiveArmor);
    }

    public applyCurse(armorReduction: number, duration: number): void {
        this.cursedArmorReduction = Math.max(this.cursedArmorReduction, armorReduction);
        this.curseTurns = Math.max(this.curseTurns, duration);
    }

    public applySlow = (duration: number): void => void (this.slowTurns = Math.max(this.slowTurns, duration));

    public shouldSkipTurnFromSlow = (): boolean => this.slowTurns > 0;

    public applyStun = (duration: number): void => void (this.stunTurns = Math.max(this.stunTurns, duration));

    public shouldSkipTurn = (): boolean => this.stunTurns > 0 || this.slowTurns > 0;

    public applyDamageOverTime(damagePerTurn: number, duration: number, sourceLabel: string): void {
        if (damagePerTurn <= 0 || duration <= 0) {
            return;
        }
        this.damageOverTimeEffects.push({ damagePerTurn, turnsRemaining: duration, sourceLabel });
    }

    public getDirectionalCombatBuffSnapshot = (): CombatBuffSnapshot => ({
        hasBlockAdvantage: this.blockAdvantage,
        hasSuccessfulDodgeMultiplier: this.successfulDodgeMultiplier !== null,
        successfulDodgeMultiplier: this.successfulDodgeMultiplier ?? 1,
    });

    public applyDirectionalCombatRewards(rewards: CombatStatusState, name: string): string[] {
        const events: string[] = [];
        if (rewards.blockAdvantage) {
            this.blockAdvantage = true;
            events.push(`${name} gains Block Advantage for the next turn. If the next turn is not an attack, it expires.`);
        }

        if (rewards.successfulDodgeMultiplier !== null) {
            this.successfulDodgeMultiplier = rewards.successfulDodgeMultiplier;
            const multiplier = rewards.successfulDodgeMultiplier.toFixed(2);
            events.push(`${name} gains a successful dodge damage multiplier for the next attack (x${multiplier}).`);
        }
        return events;
    }

    public consumeDirectionalAttackBonuses(name: string): string[] {
        const events: string[] = [];
        if (this.blockAdvantage) {
            this.blockAdvantage = false;
            events.push(`${name}'s Block Advantage is consumed by this attack.`);
        }

        if (this.successfulDodgeMultiplier !== null) {
            this.successfulDodgeMultiplier = null;
            events.push(`${name}'s successful dodge damage multiplier is consumed by this attack.`);
        }
        return events;
    }

    public expireDirectionalBonusesWithoutAttack(name: string): string[] {
        const events: string[] = [];
        if (this.blockAdvantage) {
            this.blockAdvantage = false;
            events.push(`${name}'s Block Advantage expires because no attack was used this turn.`);
        }

        if (this.successfulDodgeMultiplier !== null) {
            this.successfulDodgeMultiplier = null;
            events.push(`${name}'s successful dodge damage multiplier expires because no attack was used this turn.`);
        }
        return events;
    }

    public consumeTurnEffects(name: string, applyDamage: (amount: number) => void): string[] {
        const events: string[] = [];
        this.consumeDamageOverTime(name, applyDamage, events);
        this.consumeStun(name, events);
        this.consumeSlow(name, events);
        this.consumeCurse(name, events);
        return events;
    }

    private consumeDamageOverTime(name: string, applyDamage: (amount: number) => void, events: string[]): void {
        const remainingEffects: Array<{ damagePerTurn: number; turnsRemaining: number; sourceLabel: string }> = [];
        this.damageOverTimeEffects.forEach((effect) => {
            applyDamage(effect.damagePerTurn);
            events.push(`${name} suffers ${effect.damagePerTurn} ${effect.sourceLabel} damage.`);
            const turnsRemaining = effect.turnsRemaining - 1;
            if (turnsRemaining > 0) {
                remainingEffects.push({ ...effect, turnsRemaining });
            }
        });
        this.damageOverTimeEffects = remainingEffects;
    }

    private consumeStun(name: string, events: string[]): void {
        if (this.stunTurns <= 0) {
            return;
        }
        this.stunTurns -= 1;
        events.push(`${name} is stunned and skips this turn.`);
    }

    private consumeSlow(name: string, events: string[]): void {
        if (this.slowTurns <= 0) {
            return;
        }

        this.slowTurns -= 1;
        events.push(`${name} is slowed and skips this turn.`);
    }

    private consumeCurse(name: string, events: string[]): void {
        if (this.curseTurns <= 0) {
            return;
        }

        this.curseTurns -= 1;
        if (this.curseTurns === 0) {
            this.cursedArmorReduction = 0;
            events.push(`${name} shakes off the curse.`);
        }
    }
}
