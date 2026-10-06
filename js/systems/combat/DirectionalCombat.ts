import { DirectionalCombatExchangeResolver } from './DirectionalCombatExchangeResolver.js';

export type CombatMove =
    | 'AttackLeft'
    | 'AttackCenter'
    | 'AttackRight'
    | 'Block'
    | 'DodgeLeft'
    | 'DodgeRight';

export type CombatBuffSnapshot = {
    hasBlockAdvantage: boolean;
    hasSuccessfulDodgeMultiplier: boolean;
    successfulDodgeMultiplier: number;
};

export type CombatStatusState = {
    blockAdvantage: boolean;
    successfulDodgeMultiplier: number | null;
};

export type MoveResolution = {
    move: CombatMove;
    isAttack: boolean;
    damageDealt: number;
    logs: string[];
};

export type ExchangeResolution = {
    actor: MoveResolution;
    opponent: MoveResolution;
    actorRewards: CombatStatusState;
    opponentRewards: CombatStatusState;
    summaryLogs: string[];
};

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

const exchangeResolver = new DirectionalCombatExchangeResolver();

export const isAttackMove = (move: CombatMove): boolean => move === 'AttackLeft' || move === 'AttackCenter' || move === 'AttackRight';

export function getMoveLabel(move: CombatMove): string {
    switch (move) {
        case 'AttackLeft':
            return 'Attack Left';
        case 'AttackCenter':
            return 'Attack Center';
        case 'AttackRight':
            return 'Attack Right';
        case 'Block':
            return 'Block';
        case 'DodgeLeft':
            return 'Dodge Left';
        case 'DodgeRight':
            return 'Dodge Right';
        default:
            return move;
    }
}

export const resolveDirectionalCombatExchange = (params: ExchangeParams): ExchangeResolution => exchangeResolver.resolve(params);
