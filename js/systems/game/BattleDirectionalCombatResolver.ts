import Player from '../../entities/player/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import { CombatMove, getMoveLabel, isAttackMove, resolveDirectionalCombatExchange } from '../combat/DirectionalCombat.js';
import { resolveWeaponEnchantmentAttack } from './WeaponEnchantmentCombat.js';

type DirectionalCombatCallbacks = {
    onAddBattleLog: (message: string, type?: string) => void;
    onApplyRetaliation: (target: Skeleton, isMelee: boolean) => void;
    onTargetDefeated: (target: Skeleton) => void;
};

export default class BattleDirectionalCombatResolver {
    private player: Player;
    private callbacks: DirectionalCombatCallbacks;

    constructor(player: Player, callbacks: DirectionalCombatCallbacks) {
        this.player = player;
        this.callbacks = callbacks;
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public performExchange(playerMove: CombatMove, target: Skeleton): void {
        const enemyMove = target.rollDirectionalCombatMove();
        const exchange = resolveDirectionalCombatExchange({
            actorName: 'Player',
            opponentName: target.name,
            actorMove: playerMove,
            opponentMove: enemyMove,
            actorBaseDamage: this.player.getPhysicalDamageWithBuff(),
            opponentBaseDamage: target.getAttackDamage(),
            actorBuffs: this.player.getDirectionalCombatBuffSnapshot(),
            opponentBuffs: target.getDirectionalCombatBuffSnapshot(),
        });

        this.callbacks.onAddBattleLog(`You commit to ${getMoveLabel(playerMove)}. ${target.name} answers with ${getMoveLabel(enemyMove)}.`, 'player');
        exchange.summaryLogs.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        exchange.actor.logs.forEach((message) => this.callbacks.onAddBattleLog(`Player: ${message}`, 'system'));
        exchange.opponent.logs.forEach((message) => this.callbacks.onAddBattleLog(`${target.name}: ${message}`, 'system'));

        this.applyBonusLifecycle(exchange.actor.isAttack, exchange.opponent.isAttack, target);
        this.player.applyDirectionalCombatRewards(exchange.actorRewards).forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        target.applyDirectionalCombatRewards(exchange.opponentRewards).forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));

        this.applyDamage(exchange.actor.damageDealt, exchange.opponent.damageDealt, playerMove, enemyMove, target);
        if (target.isDead()) {
            this.callbacks.onTargetDefeated(target);
        }
    }

    private applyBonusLifecycle(actorAttacked: boolean, enemyAttacked: boolean, target: Skeleton): void {
        if (actorAttacked) {
            this.player.consumeDirectionalAttackBonuses().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        } else {
            this.player.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        }

        if (enemyAttacked) {
            target.consumeDirectionalAttackBonuses().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
            return;
        }

        target.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
    }

    private applyDamage(actorDamage: number, enemyDamage: number, actorMove: CombatMove, enemyMove: CombatMove, target: Skeleton): void {
        if (actorDamage > 0) {
            const enchantmentOutcome = resolveWeaponEnchantmentAttack(target, [this.player.equippedMainWeapon, this.player.equippedOffhandWeapon]);
            const totalDamage = Math.max(0, Math.round((actorDamage + enchantmentOutcome.flatDamageBonus) * enchantmentOutcome.damageMultiplier));
            target.takeDamage(totalDamage);
            this.callbacks.onAddBattleLog(`${target.name} takes ${totalDamage} damage from ${getMoveLabel(actorMove)}.`, 'damage');
            enchantmentOutcome.logs.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
            this.callbacks.onApplyRetaliation(target, true);
        } else if (isAttackMove(actorMove)) {
            this.callbacks.onAddBattleLog(`Your ${getMoveLabel(actorMove)} deals no damage this turn.`, 'system');
        }

        if (enemyDamage > 0) {
            this.player.takeDamage(enemyDamage);
            this.callbacks.onAddBattleLog(`Player takes ${enemyDamage} damage from ${target.name}'s ${getMoveLabel(enemyMove)}.`, 'damage');
        } else if (isAttackMove(enemyMove)) {
            this.callbacks.onAddBattleLog(`${target.name}'s ${getMoveLabel(enemyMove)} fails to deal damage.`, 'system');
        }
    }
}
