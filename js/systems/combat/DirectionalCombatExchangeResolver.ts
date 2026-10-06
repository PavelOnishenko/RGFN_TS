import { balanceConfig } from '../../config/balance/balanceConfig.js';
import {
    type CombatBuffSnapshot,
    type CombatMove,
    type CombatStatusState,
    type ExchangeResolution,
    type MoveResolution,
    getMoveLabel,
    isAttackMove,
} from './DirectionalCombat.js';

type ExchangeParams = {
    actorName: string;
    opponentName: string;
    actorMove: CombatMove;
    opponentMove: CombatMove;
    actorBaseDamage: number;
    opponentBaseDamage: number;
    actorBuffs: CombatBuffSnapshot;
    opponentBuffs: CombatBuffSnapshot;
};

type AttackRelationship = 'same' | 'adjacent' | 'opposite' | 'none';
const ATTACK_DIRECTIONS: Record<'AttackLeft' | 'AttackCenter' | 'AttackRight', number> = { AttackLeft: 0, AttackCenter: 1, AttackRight: 2 };

export class DirectionalCombatExchangeResolver {
    public resolve(params: ExchangeParams): ExchangeResolution {
        const actor = this.createNoDamageResolution(params.actorMove);
        const opponent = this.createNoDamageResolution(params.opponentMove);
        const actorRewards: CombatStatusState = { blockAdvantage: false, successfulDodgeMultiplier: null };
        const opponentRewards: CombatStatusState = { blockAdvantage: false, successfulDodgeMultiplier: null };
        const summaryLogs = [
            `${params.actorName} chooses ${getMoveLabel(params.actorMove)} while ${params.opponentName} chooses ${getMoveLabel(params.opponentMove)}.`,
        ];
        const actorDamageData = isAttackMove(params.actorMove)
            ? this.getAttackDamage(params.actorBaseDamage, params.actorBuffs)
            : { damage: 0, logs: [] as string[] };
        const opponentDamageData = isAttackMove(params.opponentMove)
            ? this.getAttackDamage(params.opponentBaseDamage, params.opponentBuffs)
            : { damage: 0, logs: [] as string[] };
        actor.logs.push(...actorDamageData.logs);
        opponent.logs.push(...opponentDamageData.logs);

        if (this.resolveAttackVsAttack(params, actor, opponent, actorDamageData.damage, opponentDamageData.damage, summaryLogs)
            || this.resolveAttackVsBlock(params, actor, opponent, actorRewards, opponentRewards, actorDamageData.damage, opponentDamageData.damage, summaryLogs)
            || this.resolveAttackVsDodge(params, actor, opponent, actorRewards, opponentRewards, actorDamageData.damage, opponentDamageData.damage, summaryLogs)) {
            return { actor, opponent, actorRewards, opponentRewards, summaryLogs };
        }

        summaryLogs.push('No attack connected in this exchange.');
        return { actor, opponent, actorRewards, opponentRewards, summaryLogs };
    }

    private createNoDamageResolution = (move: CombatMove): MoveResolution => ({ move, isAttack: isAttackMove(move), damageDealt: 0, logs: [] });

    private getAttackDamage(baseDamage: number, buffs: CombatBuffSnapshot): { damage: number; logs: string[] } {
        let damage = baseDamage;
        const logs: string[] = [];
        if (buffs.hasSuccessfulDodgeMultiplier) {
            damage = Math.round(damage * buffs.successfulDodgeMultiplier);
            logs.push(`Successful dodge bonus multiplies the attack to ${damage} damage (x${buffs.successfulDodgeMultiplier.toFixed(2)}).`);
        }
        if (buffs.hasBlockAdvantage) {
            logs.push('Block Advantage is primed and can remove the adjacent-direction penalty from this attack.');
        }
        return { damage, logs };
    }

    private resolveAttackVsAttack(
        params: ExchangeParams,
        actor: MoveResolution,
        opponent: MoveResolution,
        actorDamage: number,
        opponentDamage: number,
        summaryLogs: string[],
    ): boolean {
        if (!isAttackMove(params.actorMove) || !isAttackMove(params.opponentMove)) {
            return false;
        }

        const relation = this.getAttackRelationship(params.actorMove, params.opponentMove);
        if (relation === 'same') {
            actor.damageDealt = actorDamage;
            opponent.damageDealt = opponentDamage;
            summaryLogs.push('Both attacks matched lanes, so both sides land full damage.');
            return true;
        }

        if (relation === 'adjacent') {
            this.applyAdjacentAttackResolution(params, actor, opponent, actorDamage, opponentDamage, summaryLogs);
            return true;
        }

        summaryLogs.push('The attacks came from opposite lanes, so both attacks miss.');
        return true;
    }

    private applyAdjacentAttackResolution(
        params: ExchangeParams,
        actor: MoveResolution,
        opponent: MoveResolution,
        actorDamage: number,
        opponentDamage: number,
        summaryLogs: string[],
    ): void {
        actor.damageDealt = Math.round(actorDamage * (params.actorBuffs.hasBlockAdvantage ? 1 : balanceConfig.combat.adjacentAttackDamagePenalty));
        opponent.damageDealt = Math.round(opponentDamage * (params.opponentBuffs.hasBlockAdvantage ? 1 : balanceConfig.combat.adjacentAttackDamagePenalty));
        summaryLogs.push('The attacks were adjacent lanes, so both hits are reduced unless Block Advantage removes the penalty.');
        this.appendAdjacentAttackLog(summaryLogs, params.actorName, params.actorBuffs.hasBlockAdvantage);
        this.appendAdjacentAttackLog(summaryLogs, params.opponentName, params.opponentBuffs.hasBlockAdvantage);
    }

    private appendAdjacentAttackLog(summaryLogs: string[], actorName: string, hasBlockAdvantage: boolean): void {
        summaryLogs.push(hasBlockAdvantage
            ? `${actorName}'s Block Advantage upgrades the adjacent attack to full damage.`
            : `${actorName}'s damage is reduced by adjacentAttackDamagePenalty (${balanceConfig.combat.adjacentAttackDamagePenalty}).`);
    }

    private resolveAttackVsBlock(
        params: ExchangeParams,
        actor: MoveResolution,
        opponent: MoveResolution,
        actorRewards: CombatStatusState,
        opponentRewards: CombatStatusState,
        actorDamage: number,
        opponentDamage: number,
        summaryLogs: string[],
    ): boolean {
        if (isAttackMove(params.actorMove) && params.opponentMove === 'Block') {
            actor.damageDealt = Math.round(actorDamage * balanceConfig.combat.blockDamageReduction);
            opponentRewards.blockAdvantage = true;
            summaryLogs.push(`${params.opponentName} blocks. The attack still lands, but block reduces the damage by factor ${balanceConfig.combat.blockDamageReduction}.`);
            summaryLogs.push(`${params.opponentName} gains Block Advantage because the block absorbed an incoming attack.`);
            return true;
        }

        if (params.actorMove === 'Block' && isAttackMove(params.opponentMove)) {
            opponent.damageDealt = Math.round(opponentDamage * balanceConfig.combat.blockDamageReduction);
            actorRewards.blockAdvantage = true;
            summaryLogs.push(`${params.actorName} blocks. The attack still lands, but block reduces the damage by factor ${balanceConfig.combat.blockDamageReduction}.`);
            summaryLogs.push(`${params.actorName} gains Block Advantage because the block absorbed an incoming attack.`);
            return true;
        }

        return false;
    }

    private resolveAttackVsDodge(
        params: ExchangeParams,
        actor: MoveResolution,
        opponent: MoveResolution,
        actorRewards: CombatStatusState,
        opponentRewards: CombatStatusState,
        actorDamage: number,
        opponentDamage: number,
        summaryLogs: string[],
    ): boolean {
        if (isAttackMove(params.actorMove) && (params.opponentMove === 'DodgeLeft' || params.opponentMove === 'DodgeRight')) {
            if (params.actorMove === this.getDodgeVulnerableMove(params.opponentMove)) {
                actor.damageDealt = actorDamage;
                summaryLogs.push(`${params.opponentName}'s ${getMoveLabel(params.opponentMove)} is vulnerable to ${getMoveLabel(params.actorMove)}, so the attack connects.`);
            } else {
                opponentRewards.successfulDodgeMultiplier = balanceConfig.combat.successfulDodgeDamageMultiplier;
                summaryLogs.push(`${params.opponentName} dodges successfully. ${getMoveLabel(params.actorMove)} misses ${getMoveLabel(params.opponentMove)}.`);
                summaryLogs.push(`${params.opponentName} gains a successful dodge damage multiplier for the next attack (x${balanceConfig.combat.successfulDodgeDamageMultiplier.toFixed(2)}).`);
            }
            return true;
        }

        if ((params.actorMove === 'DodgeLeft' || params.actorMove === 'DodgeRight') && isAttackMove(params.opponentMove)) {
            if (params.opponentMove === this.getDodgeVulnerableMove(params.actorMove)) {
                opponent.damageDealt = opponentDamage;
                summaryLogs.push(`${params.actorName}'s ${getMoveLabel(params.actorMove)} is vulnerable to ${getMoveLabel(params.opponentMove)}, so the attack connects.`);
            } else {
                actorRewards.successfulDodgeMultiplier = balanceConfig.combat.successfulDodgeDamageMultiplier;
                summaryLogs.push(`${params.actorName} dodges successfully. ${getMoveLabel(params.opponentMove)} misses ${getMoveLabel(params.actorMove)}.`);
                summaryLogs.push(`${params.actorName} gains a successful dodge damage multiplier for the next attack (x${balanceConfig.combat.successfulDodgeDamageMultiplier.toFixed(2)}).`);
            }
            return true;
        }

        return false;
    }

    private getAttackRelationship(actorMove: CombatMove, opponentMove: CombatMove): AttackRelationship {
        if (!isAttackMove(actorMove) || !isAttackMove(opponentMove)) {
            return 'none';
        }
        const delta = Math.abs(ATTACK_DIRECTIONS[actorMove] - ATTACK_DIRECTIONS[opponentMove]);
        if (delta === 0) {
            return 'same';
        }
        if (delta === 1) {
            return 'adjacent';
        }
        return 'opposite';
    }

    private getDodgeVulnerableMove(move: CombatMove): CombatMove | null {
        if (move === 'DodgeLeft') {
            return 'AttackLeft';
        }
        if (move === 'DodgeRight') {
            return 'AttackRight';
        }
        return null;
    }
}
