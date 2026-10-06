/* eslint-disable style-guide/function-length-warning */
import BattleMap from '../combat/BattleMap.js';
import TurnManager from '../combat/TurnManager.js';
import Player from '../../entities/player/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import timingConfig from '../../config/timingConfig.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';

type BattleTurnControllerCallbacks = {
    onAddBattleLog: (message: string, type?: string) => void;
    onUpdateHUD: () => void;
    onEnableBattleButtons: (enabled: boolean) => void;
    onBattleEnd: (result: 'victory' | 'defeat') => void;
    onPlayerTurnReady: () => void;
    onTryApplyEscortDamage?: (enemyName: string, damage: number) => { applied: boolean; targetName?: string; died?: boolean };
};

export default class BattleTurnController {
    private battleMap: BattleMap;
    private turnManager: TurnManager;
    private player: Player;
    private callbacks: BattleTurnControllerCallbacks;

    constructor(battleMap: BattleMap, turnManager: TurnManager, player: Player, callbacks: BattleTurnControllerCallbacks) {
        this.battleMap = battleMap;
        this.turnManager = turnManager;
        this.player = player;
        this.callbacks = callbacks;
    }

    public processTurn(): void {
        const currentEntity = this.turnManager.getCurrentEntity();
        if (!currentEntity) {
            this.callbacks.onBattleEnd('victory');
            return;
        }

        if (!this.turnManager.hasActiveCombatants()) {
            this.callbacks.onBattleEnd(this.player.isDead() ? 'defeat' : 'victory');
            return;
        }

        if (this.turnManager.shouldSkipCurrentTurn()) {
            this.turnManager.clearCurrentTurnConsumption();
            this.turnManager.nextTurn();
            setTimeout(() => this.processTurn(), timingConfig.battle.enemyTurnDelay);
            return;
        }

        if (this.turnManager.isPlayerTurn()) {
            const playerEffectMessages = this.player.consumePlayerTurnEffects();
            playerEffectMessages.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
            this.turnManager.waitingForPlayer = true;
            this.callbacks.onPlayerTurnReady();
            this.callbacks.onEnableBattleButtons(true);
            return;
        }

        this.callbacks.onEnableBattleButtons(false);
        this.executeAiTurn(currentEntity as Skeleton);
    }

    private executeAiTurn(actor: Skeleton): void {
        setTimeout(() => {
            if (actor.shouldSkipTurn()) {
                const effectMessages = actor.consumeTurnEffects();
                this.completeAiTurn(effectMessages);
                return;
            }

            const effectMessages = actor.consumeTurnEffects();
            effectMessages
                .filter((message) => !message.includes('skips this turn'))
                .forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));

            const target = this.selectAiTarget(actor);
            if (!target) {
                this.completeAiTurn();
                return;
            }

            const attackRange = this.getEnemyAttackRange(actor);
            const inRange = this.battleMap.isInAttackRange(actor, target, attackRange);

            if (inRange) {
                this.performAiAttack(actor, target);
                if (this.player.isDead()) {
                    this.callbacks.onAddBattleLog('You have been defeated!', 'system');
                    setTimeout(() => this.callbacks.onBattleEnd('defeat'), timingConfig.battle.defeatEndDelay);
                    return;
                }
            } else {
                this.battleMap.moveEntityToward(actor, target, attackRange);
                this.callbacks.onAddBattleLog(`${actor.name} moves closer...`, this.turnManager.isAlly(actor) ? 'system-message' : 'enemy');
            }

            this.turnManager.nextTurn();
            setTimeout(() => this.processTurn(), timingConfig.battle.enemyTurnDelay);
        }, timingConfig.battle.enemyActionStartDelay);
    }

    private completeAiTurn(logs: string[] = []): void {
        logs.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        this.turnManager.nextTurn();
        setTimeout(() => this.processTurn(), timingConfig.battle.enemyTurnDelay);
    }


    private getEnemyAttackRange(enemy: Skeleton): number {
        const rangedEnemy = enemy as Skeleton & { getAttackRange?: () => number };
        return rangedEnemy.getAttackRange ? rangedEnemy.getAttackRange() : 1;
    }

    private performAiAttack(attacker: Skeleton, target: Player | Skeleton): void {
        if (this.tryPerformEnemyMagicAttack(attacker, target)) {
            return;
        }

        const logType = this.turnManager.isAlly(attacker) ? 'system-message' : 'enemy';
        this.callbacks.onAddBattleLog(`${attacker.name} attacks!`, logType);
        attacker.consumeDirectionalAttackBonuses().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        if (Math.random() < (target instanceof Player ? this.player.avoidChance : target.avoidChance)) {
            this.callbacks.onAddBattleLog(`${target instanceof Player ? 'You' : target.name} evade${target instanceof Player ? '' : 's'} the hit!`, 'system');
            return;
        }

        const damageBeforeArmor = attacker.getAttackDamage();
        if (target instanceof Player) {
            const escortResult = this.callbacks.onTryApplyEscortDamage?.(attacker.name, damageBeforeArmor) ?? { applied: false };
            if (escortResult.applied) {
                this.callbacks.onAddBattleLog(`${attacker.name} strikes ${escortResult.targetName} for ${damageBeforeArmor} damage!`, 'enemy');
                if (escortResult.died) {
                    this.callbacks.onAddBattleLog(`${escortResult.targetName} falls in battle. Escort objective failed.`, 'system');
                }
                this.callbacks.onUpdateHUD();
                return;
            }
        }
        const targetArmor = target instanceof Player ? this.player.armor : target.armor;
        const damageAfterArmor = damageBeforeArmor <= 0 ? 0 : Math.max(balanceConfig.combat.minDamageAfterArmor, damageBeforeArmor - targetArmor);
        target.takeDamage(damageBeforeArmor);
        if (targetArmor > 0 && damageAfterArmor < damageBeforeArmor) {
            this.callbacks.onAddBattleLog(`${target instanceof Player ? 'Player' : target.name} takes ${damageAfterArmor} damage (${damageBeforeArmor - damageAfterArmor} blocked by armor)!`, 'damage');
        } else {
            this.callbacks.onAddBattleLog(`${target instanceof Player ? 'Player' : target.name} takes ${damageAfterArmor} damage!`, 'damage');
        }

        this.callbacks.onUpdateHUD();
    }

    private tryPerformEnemyMagicAttack(attacker: Skeleton, target: Player | Skeleton): boolean {
        const caster = attacker as Skeleton & {
            canUseMagic?: () => boolean;
            getMagicManaCost?: () => number;
            getMagicDamage?: () => number;
            spendMana?: (amount: number) => void;
        };
        if (!caster.canUseMagic || !caster.canUseMagic() || Math.random() >= 0.35) {
            return false;
        }
        attacker.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        const magicDamage = caster.getMagicDamage ? caster.getMagicDamage() : attacker.damage;
        const manaCost = caster.getMagicManaCost ? caster.getMagicManaCost() : 0;
        caster.spendMana?.(manaCost);
        target.takeMagicDamage ? target.takeMagicDamage(magicDamage) : target.takeDamage(magicDamage);
        this.callbacks.onAddBattleLog(`${attacker.name} casts a spell for ${magicDamage} damage!`, this.turnManager.isAlly(attacker) ? 'system-message' : 'enemy');
        this.callbacks.onUpdateHUD();
        return true;
    }

    private selectAiTarget(actor: Skeleton): Player | Skeleton | null {
        const opponents = this.turnManager.getOpponentsOf(actor) as Array<Player | Skeleton>;
        if (opponents.length === 0) {
            return null;
        }
        return opponents
            .map((candidate) => ({ candidate, distance: this.distanceBetween(actor, candidate) }))
            .sort((left, right) => left.distance - right.distance)[0]?.candidate ?? null;
    }

    private distanceBetween(source: Skeleton, target: Player | Skeleton): number {
        if (source.gridCol === undefined || source.gridRow === undefined || target.gridCol === undefined || target.gridRow === undefined) {
            return Number.MAX_SAFE_INTEGER;
        }
        return Math.abs(source.gridCol - target.gridCol) + Math.abs(source.gridRow - target.gridRow);
    }
}
