import { balanceConfig } from '../../../config/balance/balanceConfig.js';
import { theme } from '../../../config/ThemeConfig.js';
import { CombatBuffSnapshot, CombatStatusState } from '../../../systems/combat/DirectionalCombat.js';
import PlayerProgression from './PlayerProgression.js';

export default class PlayerCombatState extends PlayerProgression {
    private rageTurns: number = 0;
    private rageMultiplier: number = 1;
    private blockAdvantage: boolean = false;
    private successfulDodgeMultiplier: number | null = null;

    public spendMana(amount: number): boolean {
        if (amount <= 0) {return true;}
        if (this.mana < amount) {return false;}
        this.mana -= amount;
        return true;
    }

    public canSpendMana = (amount: number): boolean => this.mana >= amount;
    public getMaxFatigue = (): number => Math.max(1, balanceConfig.survival.maxFatigue);

    public addTravelFatigue(cells: number = 1): number {
        if (cells <= 0) {return 0;}
        const cellTravelMinutes = Math.max(1, theme.worldMap.cellTravelMinutes);
        const awakeHours = Math.max(1, balanceConfig.survival.awakeHoursPerDay);
        const comfortableDailyCells = Math.max(1, Math.floor((awakeHours * 60) / cellTravelMinutes));
        const fatiguePerCell = this.getMaxFatigue() / comfortableDailyCells;
        const addedFatigue = fatiguePerCell * cells;
        this.fatigue = Math.min(this.getMaxFatigue(), this.fatigue + addedFatigue);
        return addedFatigue;
    }

    public recoverFatigue(amount: number): number {
        if (amount <= 0) {return 0;}
        const previous = this.fatigue;
        this.fatigue = Math.max(0, this.fatigue - amount);
        return previous - this.fatigue;
    }

    public getFatiguePercent = (): number => (this.fatigue / this.getMaxFatigue()) * 100;
    public getFatigueStateLabel(): string {
        if (this.fatigue >= balanceConfig.survival.highFatigueThreshold) {return 'Exhausted';}
        if (this.fatigue >= balanceConfig.survival.cautionFatigueThreshold) {return 'Tired';}
        return 'Rested';
    }

    public getPhysicalDamageWithBuff = (): number => Math.round(this.damage * this.rageMultiplier);
    public getMagicPowerMultiplier = (): number => this.rageMultiplier;
    public getArmorReduction = (): number => this.armor;

    public getDirectionalCombatBuffSnapshot = (): CombatBuffSnapshot => ({
        hasBlockAdvantage: this.blockAdvantage,
        hasSuccessfulDodgeMultiplier: this.successfulDodgeMultiplier !== null,
        successfulDodgeMultiplier: this.successfulDodgeMultiplier ?? 1,
    });

    public applyDirectionalCombatRewards(rewards: CombatStatusState): string[] {
        const events: string[] = [];
        if (rewards.blockAdvantage) { 
            this.blockAdvantage = true; events.push(`${this.name} gains Block Advantage for the next turn. If the next turn is not an attack, it expires.`); 
        }
        if (rewards.successfulDodgeMultiplier !== null) {
            this.successfulDodgeMultiplier = rewards.successfulDodgeMultiplier;
            events.push(`${this.name} gains a successful dodge damage multiplier for the next attack (x${rewards.successfulDodgeMultiplier.toFixed(2)}).`);
        }
        return events;
    }

    public consumeDirectionalAttackBonuses(): string[] {
        const events: string[] = [];
        if (this.blockAdvantage) { this.blockAdvantage = false; events.push(`${this.name}'s Block Advantage is consumed by this attack.`); }
        if (this.successfulDodgeMultiplier !== null) { 
            this.successfulDodgeMultiplier = null; events.push(`${this.name}'s successful dodge damage multiplier is consumed by this attack.`); 
        }
        return events;
    }

    public expireDirectionalBonusesWithoutAttack(): string[] {
        const events: string[] = [];
        if (this.blockAdvantage) { this.blockAdvantage = false; events.push(`${this.name}'s Block Advantage expires because no attack was used this turn.`); }
        if (this.successfulDodgeMultiplier !== null) { 
            this.successfulDodgeMultiplier = null; events.push(`${this.name}'s successful dodge damage multiplier expires because no attack was used this turn.`); 
        }
        return events;
    }

    public applyRage(turns: number, multiplier: number): void {
        this.rageTurns = Math.max(this.rageTurns, turns);
        this.rageMultiplier = Math.max(this.rageMultiplier, multiplier);
    }

    public consumePlayerTurnEffects(): string[] {
        if (this.rageTurns <= 0) {
            return [];
        }
        this.rageTurns -= 1;
        if (this.rageTurns > 0) {
            return [];
        }
        this.rageMultiplier = 1;
        return ['Rage fades.'];
    }

    protected getCombatState = (): { rageTurns: number; rageMultiplier: number; blockAdvantage: boolean; successfulDodgeMultiplier: number | null } => ({
        rageTurns: this.rageTurns,
        rageMultiplier: this.rageMultiplier,
        blockAdvantage: this.blockAdvantage,
        successfulDodgeMultiplier: this.successfulDodgeMultiplier,
    });

    protected setCombatState(state: { rageTurns: number; rageMultiplier: number; blockAdvantage: boolean; successfulDodgeMultiplier: number | null }): void {
        this.rageTurns = state.rageTurns;
        this.rageMultiplier = state.rageMultiplier;
        this.blockAdvantage = state.blockAdvantage;
        this.successfulDodgeMultiplier = state.successfulDodgeMultiplier;
    }
}
