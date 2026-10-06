import { randomInt } from '../../utils/MathUtils.js';
import type { CombatMove } from './DirectionalCombat.js';

export type MonsterDirectionalBehavior = {
    id: string;
    weight: number;
    moves: CombatMove[];
};

export type MonsterDirectionalBehaviorCodex = Record<string, MonsterDirectionalBehavior[]>;

type MonsterBehaviorGenerationConfig = {
    minBehaviorsPerMonsterType: number;
    maxBehaviorsPerMonsterType: number;
    minMovesPerBehavior: number;
    maxMovesPerBehavior: number;
    behaviorWeightMin: number;
    behaviorWeightMax: number;
    monsterMovePools: Record<string, string[]>;
};

const COMBAT_MOVES: CombatMove[] = ['AttackLeft', 'AttackCenter', 'AttackRight', 'Block', 'DodgeLeft', 'DodgeRight'];

const pickOne = <T>(items: T[]): T => items[randomInt(0, items.length - 1)];

const sanitizeMovePool = (movePool: string[]): CombatMove[] => {
    const set = new Set(COMBAT_MOVES);
    const sanitized = movePool.filter((move): move is CombatMove => set.has(move as CombatMove));
    return sanitized.length > 0 ? sanitized : ['AttackCenter'];
};

// eslint-disable-next-line style-guide/function-length-warning
const generateBehaviorPoolFromMovePool = (
    behaviorPoolId: string,
    movePool: string[],
    config: Pick<
        MonsterBehaviorGenerationConfig,
        'minBehaviorsPerMonsterType'
        | 'maxBehaviorsPerMonsterType'
        | 'minMovesPerBehavior'
        | 'maxMovesPerBehavior'
        | 'behaviorWeightMin'
        | 'behaviorWeightMax'
    >,
): MonsterDirectionalBehavior[] => {
    const sanitizedPool = sanitizeMovePool(movePool);
    const behaviorCount = randomInt(config.minBehaviorsPerMonsterType, config.maxBehaviorsPerMonsterType);
    const createBehavior = (behaviorIndex: number): MonsterDirectionalBehavior => {
        const movesCount = randomInt(config.minMovesPerBehavior, config.maxMovesPerBehavior);
        const moves = Array.from({ length: movesCount }, () => pickOne(sanitizedPool));
        const weight = randomInt(config.behaviorWeightMin, config.behaviorWeightMax);
        return { id: `${behaviorPoolId}-behavior-${behaviorIndex + 1}`, weight, moves };
    };
    return Array.from({ length: behaviorCount }, (_, behaviorIndex) => createBehavior(behaviorIndex));
};

export function generateMonsterDirectionalBehaviorCodex(config: MonsterBehaviorGenerationConfig): MonsterDirectionalBehaviorCodex {
    const codex: MonsterDirectionalBehaviorCodex = {};

    Object.entries(config.monsterMovePools).forEach(([monsterType, movePool]) => {
        codex[monsterType] = generateBehaviorPoolFromMovePool(monsterType, movePool, config);
    });

    return codex;
}

export const generateDirectionalBehaviorPool = (
    behaviorPoolId: string,
    movePool: string[],
    config: Pick<
        MonsterBehaviorGenerationConfig,
        'minBehaviorsPerMonsterType'
        | 'maxBehaviorsPerMonsterType'
        | 'minMovesPerBehavior'
        | 'maxMovesPerBehavior'
        | 'behaviorWeightMin'
        | 'behaviorWeightMax'
    >,
): MonsterDirectionalBehavior[] => generateBehaviorPoolFromMovePool(behaviorPoolId, movePool, config);

export function selectWeightedBehavior(behaviors: MonsterDirectionalBehavior[]): MonsterDirectionalBehavior | null {
    const totalWeight = behaviors.reduce((sum, behavior) => sum + Math.max(0, behavior.weight), 0);
    if (totalWeight <= 0 || behaviors.length === 0) {
        return behaviors[0] ?? null;
    }

    let roll = Math.random() * totalWeight;
    for (const behavior of behaviors) {
        roll -= Math.max(0, behavior.weight);
        if (roll <= 0) {
            return behavior;
        }
    }

    return behaviors[behaviors.length - 1] ?? null;
}
