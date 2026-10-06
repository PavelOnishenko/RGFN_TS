/* eslint-disable style-guide/file-length-warning */
import Entity from '../core/Entity.js';
import { withDamageable } from '../core/Damageable.js';
import { balanceConfig } from '../config/balance/balanceConfig.js';
import { cloneBaseStats, deriveCreatureStats, normalizeCreatureSkills } from '../config/creatureStats.js';
import { CreatureBaseStats, CreatureSkill, CreatureSkills } from '../config/creatureTypes.js';
import { CombatBuffSnapshot, CombatMove, CombatStatusState } from '../systems/combat/DirectionalCombat.js';
import { generateDirectionalBehaviorPool } from '../systems/combat/MonsterBehaviorCodex.js';
import { MonsterDirectionalBehavior, selectWeightedBehavior } from '../systems/combat/MonsterBehaviorCodex.js';
import { MonsterMutationEngine } from './monster/MonsterMutationEngine.js';
import { MonsterStatusEffects } from './monster/MonsterStatusEffects.js';
import { MonsterVisualRenderer } from './monster/MonsterVisualRenderer.js';

export interface EnemyBehavior {
    avoidHitChance?: number;
    doubleDamageChance?: number;
    passEncounterChance?: number;
}

export type MonsterMutationTrait =
    | 'feral strength'
    | 'void armor'
    | 'acid blood'
    | 'blink speed'
    | 'barbed hide'
    | 'grave intellect';

export interface EnemyConfig {
    archetypeId?: keyof typeof balanceConfig.creatureArchetypes;
    xpValue: number;
    name: string;
    width: number;
    height: number;
    behavior?: EnemyBehavior;
    baseStats?: Partial<CreatureBaseStats>;
    skills?: Partial<Record<CreatureSkill, number>>;
    mutations?: MonsterMutationTrait[];
}

type SkeletonInitialization = {
    config: EnemyConfig;
    archetypeId: keyof typeof balanceConfig.creatureArchetypes;
    baseStats: CreatureBaseStats;
    skills: CreatureSkills;
};

const DamageableEntity = withDamageable(Entity);

export default class Skeleton extends DamageableEntity {
    declare x: number;
    declare y: number;
    declare width: number;
    declare height: number;
    declare velocityX: number;
    declare velocityY: number;
    declare active: boolean;
    declare id: number;
    declare move: (deltaTime: number) => void;
    declare getBounds: () => { left: number; right: number; top: number; bottom: number };
    declare checkCollision: (other: any) => boolean;
    declare hp: number;
    declare maxHp: number;
    declare initDamageable: (maxHp: number) => void;
    declare heal: (amount: number) => void;
    declare isDead: () => boolean;
    declare getHealthPercent: () => number;
    declare healToFull: () => void;

    public damage: number;
    public name: string;
    public xpValue: number;
    public behavior: EnemyBehavior;
    public gridCol?: number;
    public gridRow?: number;
    public readonly archetypeId: keyof typeof balanceConfig.creatureArchetypes;
    public readonly baseStats: CreatureBaseStats;
    public readonly skills: CreatureSkills;
    public armor: number;
    public avoidChance: number;
    public maxMana: number;
    public magicPoints: number;
    public mana: number;
    public readonly mutations: MonsterMutationTrait[];

    private directionalBehaviorPool: MonsterDirectionalBehavior[];
    private activeDirectionalBehavior: { id: string; moves: CombatMove[]; nextMoveIndex: number } | null;

    private readonly monsterStatusEffects: MonsterStatusEffects;
    private readonly monsterVisualRenderer: MonsterVisualRenderer;

    // eslint-disable-next-line style-guide/function-length-warning
    constructor(x: number, y: number, enemyConfig?: EnemyConfig) {
        super(x, y);
        const { config, archetypeId, baseStats, skills } = this.buildInitialization(enemyConfig);
        const derivedStats = deriveCreatureStats(baseStats, skills);
        this.width = config.width;
        this.height = config.height;
        this.name = config.name;
        this.xpValue = config.xpValue;
        this.behavior = config.behavior ?? {};
        this.archetypeId = archetypeId;
        this.baseStats = baseStats;
        this.skills = skills;
        this.assignDerivedCombatStats(derivedStats);
        this.mutations = [...(config.mutations ?? [])];
        this.directionalBehaviorPool = [];
        this.activeDirectionalBehavior = null;
        MonsterMutationEngine.applyMutations(this);
        this.monsterStatusEffects = new MonsterStatusEffects();
        this.monsterVisualRenderer = new MonsterVisualRenderer();
        this.initializeHp(derivedStats.maxHp);
        this.initializeHumanDirectionalBehaviorPool();
    }

    private buildInitialization(enemyConfig?: EnemyConfig): SkeletonInitialization {
        const config: EnemyConfig = enemyConfig ?? balanceConfig.enemies.skeleton;
        const archetypeId = config.archetypeId ?? 'skeleton';
        const archetype = this.resolveArchetype(archetypeId);
        const baseStats = this.mergeBaseStats(archetype.baseStats, config.baseStats);
        const skills = this.mergeSkills(archetype.skills, config.skills);
        return { config, archetypeId, baseStats, skills };
    }

    private resolveArchetype = (archetypeId: keyof typeof balanceConfig.creatureArchetypes) =>
        balanceConfig.creatureArchetypes[archetypeId] ?? balanceConfig.creatureArchetypes.skeleton;

    private mergeBaseStats = (baseStats: CreatureBaseStats, overrides?: Partial<CreatureBaseStats>): CreatureBaseStats =>
        ({ ...cloneBaseStats(baseStats), ...(overrides ?? {}) });

    private mergeSkills = (skills: Partial<Record<CreatureSkill, number>>, overrides?: Partial<Record<CreatureSkill, number>>): CreatureSkills =>
        normalizeCreatureSkills({ ...skills, ...(overrides ?? {}) });

    private assignDerivedCombatStats(derivedStats: ReturnType<typeof deriveCreatureStats>): void {
        this.damage = derivedStats.physicalDamage;
        this.armor = derivedStats.armor;
        this.avoidChance = derivedStats.avoidChance;
        this.maxMana = derivedStats.maxMana;
        this.magicPoints = derivedStats.magicPoints;
        this.mana = derivedStats.maxMana;
    }

    private initializeHp(maxHp: number): void {
        const hpMultiplier = Math.max(0, balanceConfig.enemies.hpMultiplier ?? 1);
        (this as any).initDamageable(Math.round(maxHp * hpMultiplier));
    }

    private initializeHumanDirectionalBehaviorPool(): void {
        if (this.archetypeId !== 'human') {
            return;
        }

        const behaviorGeneration = balanceConfig.combat.enemyBehaviorGeneration;
        const movePool = behaviorGeneration.monsterMovePools.human;
        if (!movePool || movePool.length === 0) {
            throw new Error('Missing directional move pool for human archetype.');
        }
        const behaviorPoolId = `human-${this.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}-${this.id}`;
        const behaviorPool = generateDirectionalBehaviorPool(behaviorPoolId, movePool, behaviorGeneration);
        this.setDirectionalBehaviorPool(behaviorPool);
    }

    public takeDamage(amount: number): boolean {
        const damageAfterArmor = this.monsterStatusEffects.calculatePhysicalDamage(amount, this.armor);
        return this.applyIncomingDamage(damageAfterArmor);
    }

    public takeMagicDamage = (amount: number): boolean => this.applyIncomingDamage(Math.max(0, amount));

    public applyCurse(armorReduction: number, duration: number): void {
        this.monsterStatusEffects.applyCurse(armorReduction, duration);
    }

    public applySlow(duration: number): void {
        this.monsterStatusEffects.applySlow(duration);
    }

    public shouldSkipTurnFromSlow = (): boolean => this.monsterStatusEffects.shouldSkipTurnFromSlow();

    public shouldSkipTurn = (): boolean => this.monsterStatusEffects.shouldSkipTurn();

    public applyStun(duration: number): void {
        this.monsterStatusEffects.applyStun(duration);
    }

    public applyDamageOverTime(damagePerTurn: number, duration: number, sourceLabel: string): void {
        this.monsterStatusEffects.applyDamageOverTime(damagePerTurn, duration, sourceLabel);
    }

    public getDirectionalCombatBuffSnapshot = (): CombatBuffSnapshot => this.monsterStatusEffects.getDirectionalCombatBuffSnapshot();

    public applyDirectionalCombatRewards = (rewards: CombatStatusState): string[] => this.monsterStatusEffects.applyDirectionalCombatRewards(rewards, this.name);

    public consumeDirectionalAttackBonuses = (): string[] => this.monsterStatusEffects.consumeDirectionalAttackBonuses(this.name);

    public expireDirectionalBonusesWithoutAttack = (): string[] => this.monsterStatusEffects.expireDirectionalBonusesWithoutAttack(this.name);

    public consumeTurnEffects = (): string[] => this.monsterStatusEffects.consumeTurnEffects(this.name, (amount) => void this.applyIncomingDamage(Math.max(0, amount)));

    public getSkillRecord = (): CreatureSkills => normalizeCreatureSkills(this.skills);

    public getBaseStatsRecord = (): CreatureBaseStats => cloneBaseStats(this.baseStats);

    public draw(ctx: CanvasRenderingContext2D, _viewport?: any): void {
        this.monsterVisualRenderer.drawEntity(ctx, this.name, this.x, this.y, this.width, this.height);
        this.monsterVisualRenderer.drawHealthBar(ctx, this.x, this.y, this.width, this.height, this.hp, this.maxHp);
    }


    public setDirectionalBehaviorPool(behaviorPool: MonsterDirectionalBehavior[]): void {
        this.directionalBehaviorPool = behaviorPool
            .filter((behavior) => behavior.moves.length > 0)
            .map((behavior) => ({ id: behavior.id, weight: behavior.weight, moves: [...behavior.moves] }));
        this.activeDirectionalBehavior = null;
        if (this.directionalBehaviorPool.length === 0) {
            throw new Error(`Monster "${this.name}" received an empty directional behavior pool.`);
        }
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public rollDirectionalCombatMove(): CombatMove {
        if (!this.activeDirectionalBehavior || this.activeDirectionalBehavior.nextMoveIndex >= this.activeDirectionalBehavior.moves.length) {
            const nextBehavior = selectWeightedBehavior(this.directionalBehaviorPool);
            if (!nextBehavior) {
                throw new Error(`Monster "${this.name}" has no directional behavior to execute.`);
            }

            this.activeDirectionalBehavior = { id: nextBehavior.id, moves: [...nextBehavior.moves], nextMoveIndex: 0 };
        }

        const nextMove = this.activeDirectionalBehavior.moves[this.activeDirectionalBehavior.nextMoveIndex];
        if (!nextMove) {
            throw new Error(`Monster "${this.name}" attempted to execute an invalid directional behavior move.`);
        }
        this.activeDirectionalBehavior.nextMoveIndex += 1;
        if (this.activeDirectionalBehavior.nextMoveIndex >= this.activeDirectionalBehavior.moves.length) {
            this.activeDirectionalBehavior = null;
        }

        return nextMove;
    }



    public shouldAvoidHit(): boolean {
        const behaviorChance = this.behavior.avoidHitChance ?? 0;
        return MonsterMutationEngine.shouldAvoidHit(behaviorChance, this.avoidChance);
    }

    public getAttackDamage = (): number => MonsterMutationEngine.getAttackDamage(this.damage, this.behavior.doubleDamageChance ?? 0);

    public shouldPassEncounter = (): boolean => MonsterMutationEngine.shouldPassEncounter(this.behavior.passEncounterChance ?? 0);

    public onDamagedByPlayer = (
        isMelee: boolean,
    ): { retaliationDamage: number; logs: string[] } =>
        MonsterMutationEngine.onDamagedByPlayer(this.name, this.mutations, isMelee);

    private applyIncomingDamage(amount: number): boolean {
        const died = super.takeDamage(amount);
        if (died) {
            this.active = false;
        }
        return died;
    }
}
