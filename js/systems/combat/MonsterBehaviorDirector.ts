import { balanceConfig } from '../../config/balance/balanceConfig.js';
import Skeleton from '../../entities/Skeleton.js';
import { generateMonsterDirectionalBehaviorCodex, MonsterDirectionalBehavior, MonsterDirectionalBehaviorCodex } from './MonsterBehaviorCodex.js';

let worldMonsterBehaviorCodex: MonsterDirectionalBehaviorCodex | null = null;

const cloneBehaviorPool = (behaviorPool: MonsterDirectionalBehavior[]): MonsterDirectionalBehavior[] =>
    behaviorPool.map((behavior) => ({ id: behavior.id, weight: behavior.weight, moves: [...behavior.moves] }));

export const initializeWorldMonsterBehaviorCodex = (): MonsterDirectionalBehaviorCodex => {
    worldMonsterBehaviorCodex = generateMonsterDirectionalBehaviorCodex(balanceConfig.combat.enemyBehaviorGeneration);
    return getWorldMonsterBehaviorCodexSnapshot();
};

export const ensureWorldMonsterBehaviorCodex = (): MonsterDirectionalBehaviorCodex => {
    if (!worldMonsterBehaviorCodex) {
        return initializeWorldMonsterBehaviorCodex();
    }

    return getWorldMonsterBehaviorCodexSnapshot();
};

export const assignMonsterBehaviorPool = (enemy: Skeleton): void => {
    const codex = ensureWorldMonsterBehaviorCodex();
    const behaviorPool = codex[enemy.archetypeId];
    if (!behaviorPool || behaviorPool.length === 0) {
        throw new Error(`Missing monster behavior pool for archetype "${enemy.archetypeId}".`);
    }

    enemy.setDirectionalBehaviorPool(behaviorPool);
};

export const getWorldMonsterBehaviorCodexSnapshot = (): MonsterDirectionalBehaviorCodex => {
    if (!worldMonsterBehaviorCodex) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(worldMonsterBehaviorCodex).map(([monsterType, behaviors]) => [monsterType, cloneBehaviorPool(behaviors)]),
    );
};
