import BattleMap from '../combat/BattleMap.js';
import TurnManager from '../combat/TurnManager.js';
import StateMachine from '../../utils/StateMachine.js';
import Player from '../../entities/player/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import timingConfig from '../../config/timingConfig.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';
import MagicSystem, { BaseSpellId } from '../controllers/magic/MagicSystem.js';
import { CombatMove, getMoveLabel } from '../combat/DirectionalCombat.js';
import BattleTargetResolver from './BattleTargetResolver.js';
import BattleLootManager from './BattleLootManager.js';
import BattleDirectionalCombatResolver from './BattleDirectionalCombatResolver.js';
import { resolveWeaponEnchantmentAttack } from './WeaponEnchantmentCombat.js';
type BattleCommandCallbacks = {
    onUpdateHUD: () => void; onAddBattleLog: (message: string, type?: string) => void; onEnableBattleButtons: (enabled: boolean) => void;
    onProcessTurn: () => void; onEndBattle: (result: 'victory' | 'fled') => void; onPlayerTurnTransitionStart: () => void; onPlayerTurnReady: () => void;
    getSelectedEnemy: () => Skeleton | null; setSelectedEnemy: (enemy: Skeleton | null) => void;
    onEnemyDefeated?: (enemy: Skeleton) => void;
};
export default class BattleCommandController {
    private stateMachine: StateMachine; private player: Player; private battleMap: BattleMap; private turnManager: TurnManager;
    private callbacks: BattleCommandCallbacks; private magicSystem: MagicSystem; private targetResolver: BattleTargetResolver;
    private lootManager: BattleLootManager; private directionalCombatResolver: BattleDirectionalCombatResolver;
    constructor(stateMachine: StateMachine, player: Player, battleMap: BattleMap, turnManager: TurnManager, magicSystem: MagicSystem, callbacks: BattleCommandCallbacks) {
        this.stateMachine = stateMachine;
        this.player = player;
        this.battleMap = battleMap;
        this.turnManager = turnManager;
        this.magicSystem = magicSystem;
        this.callbacks = callbacks;
        this.targetResolver = new BattleTargetResolver(player, battleMap, callbacks.getSelectedEnemy);
        this.lootManager = new BattleLootManager();
        this.directionalCombatResolver = new BattleDirectionalCombatResolver(player, {
            onAddBattleLog: callbacks.onAddBattleLog,
            onApplyRetaliation: this.applyRetaliationEffects,
            onTargetDefeated: this.handleTargetDefeated,
        });
    }
    public handleEquipmentAction(actionDescription: string): boolean {
        if (!this.stateMachine.isInState('BATTLE')) {return true;}
        if (!this.canUseBattleTurnInput()) {
            this.callbacks.onAddBattleLog('You can only change equipment on your own turn.', 'system');
            return false;
        }
        this.beginPlayerAction();
        this.callbacks.onAddBattleLog(`${actionDescription} It takes 3 turns to complete.`, 'player');
        this.turnManager.consumeUpcomingTurns(this.player, 2);
        this.finishPlayerAction(timingConfig.battle.playerActionDelay);
        return true;
    }
    public handleAttack(): void {
        if (!this.canUseBattleTurnInput()) {return;}
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        if (enemies.length === 0) {this.callbacks.onEndBattle('victory'); return;}
        const target = this.targetResolver.resolveAttackTarget(enemies);
        if (!target) {this.reportMissingRangeTarget(); return;}

        this.beginPlayerAction();
        this.performAttack(target);
        this.callbacks.onUpdateHUD();
        this.finishPlayerAction(timingConfig.battle.playerActionDelay);
    }

    public handleDirectionalCombatMove(move: CombatMove): void {
        if (!this.canUseBattleTurnInput()) {return;}
        const target = this.targetResolver.resolveDirectionalTarget(this.turnManager.getActiveEnemies() as Skeleton[]);
        if (!target) {
            this.callbacks.onAddBattleLog(`You tried to use ${getMoveLabel(move)}, but no adjacent enemy is available for directional melee combat.`, 'system');
            return;
        }

        this.beginPlayerAction();
        this.directionalCombatResolver.performExchange(move, target);
        this.callbacks.onUpdateHUD();
        this.turnManager.consumeUpcomingTurn(target);
        this.finishPlayerAction(timingConfig.battle.playerActionDelay);
    }

    public handleCastSpell(spellId: BaseSpellId): void {
        if (!this.canUseBattleTurnInput()) {return;}
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        const target = spellId === 'rage' ? this.player : this.targetResolver.resolveSpellTarget(spellId, enemies);
        if (!target) {this.callbacks.onAddBattleLog('No valid spell target selected.', 'system'); return;}

        const result = this.magicSystem.castSpell(spellId, target);
        if (!result.ok) {this.callbacks.onAddBattleLog(result.message, 'system'); this.callbacks.onUpdateHUD(); return;}

        this.beginPlayerAction();
        this.callbacks.onAddBattleLog(result.message, 'player');
        if (target instanceof Skeleton && target.isDead()) {this.handleTargetDefeated(target);}
        this.callbacks.onUpdateHUD();
        this.finishPlayerAction(timingConfig.battle.playerActionDelay);
    }

    public handleFlee(): void {
        if (!this.canUseBattleTurnInput()) {return;}
        if (!this.battleMap.isEntityOnEdge(this.player)) {
            this.callbacks.onAddBattleLog('You can only flee when standing on the battle map edge.', 'system');
            return;
        }

        this.beginPlayerAction();
        if (Math.random() < balanceConfig.combat.fleeChance) {
            this.callbacks.onAddBattleLog('You fled from battle!', 'system');
            setTimeout(() => this.callbacks.onEndBattle('fled'), timingConfig.battle.fleeSuccessDelay);
            return;
        }

        this.callbacks.onAddBattleLog('Failed to flee!', 'system');
        this.finishPlayerAction(timingConfig.battle.fleeFailedDelay);
    }

    public handleWait(): void {
        if (!this.canUseBattleTurnInput()) {return;}
        this.beginPlayerAction();
        this.callbacks.onAddBattleLog('You waited.', 'player');
        this.finishPlayerAction(timingConfig.battle.waitActionDelay);
    }

    public handleUseManaPotion(fromBattleControls: boolean): void {
        this.handlePotionUse(fromBattleControls, this.player.useManaPotion.bind(this.player), 'No mana potions in inventory.', `You drink a mana potion (+${balanceConfig.combat.manaPotionRestore} mana).`);
    }

    public handleUsePotion(fromBattleControls: boolean): void {
        this.handlePotionUse(fromBattleControls, this.player.useHealingPotion.bind(this.player), 'No healing potions in inventory.', 'You drink a healing potion (+5 HP).');
    }

    public resolvePendingLoot(): void {
        this.lootManager.resolvePendingLoot(this.player, this.callbacks);
    }

    public clearPendingLoot = (): void => {
        this.lootManager.clearPendingLoot();
    };

    private canUseBattleTurnInput = (): boolean => this.turnManager.isPlayerTurn() && this.turnManager.waitingForPlayer;

    private beginPlayerAction(): void {
        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
        this.player.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
    }

    private finishPlayerAction(delayMs: number): void {
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), delayMs);
    }

    private reportMissingRangeTarget(): void {
        this.callbacks.onAddBattleLog('No enemy in range! Move closer first.', 'system');
        this.callbacks.onPlayerTurnReady();
        this.turnManager.waitingForPlayer = true;
        this.callbacks.onEnableBattleButtons(true);
    }

    private performAttack(target: Skeleton): void {
        const attackBonusMessages = this.player.consumeDirectionalAttackBonuses();
        this.callbacks.onAddBattleLog('You attack!', 'player');
        attackBonusMessages.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        if (target.shouldAvoidHit()) {this.callbacks.onAddBattleLog(`${target.name} dodges the hit!`, 'enemy'); return;}

        const enchantmentOutcome = resolveWeaponEnchantmentAttack(target, [this.player.equippedMainWeapon, this.player.equippedOffhandWeapon]);
        const damage = Math.max(0, Math.round((this.player.getPhysicalDamageWithBuff() + enchantmentOutcome.flatDamageBonus) * enchantmentOutcome.damageMultiplier));
        target.takeDamage(damage);
        this.callbacks.onAddBattleLog(`${target.name} takes ${damage} damage!`, 'damage');
        enchantmentOutcome.logs.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        this.applyRetaliationEffects(target, true);
        if (target.isDead()) {this.handleTargetDefeated(target);}
    }

    private applyRetaliationEffects = (target: Skeleton, isMelee: boolean): void => {
        const retaliation = target.onDamagedByPlayer(isMelee);
        retaliation.logs.forEach((message) => this.callbacks.onAddBattleLog(message, 'enemy'));
        if (retaliation.retaliationDamage <= 0) {return;}
        this.player.takeDamage(retaliation.retaliationDamage);
        this.callbacks.onAddBattleLog(`Player takes ${retaliation.retaliationDamage} retaliation damage.`, 'damage');
        this.callbacks.onUpdateHUD();
    };

    private handleTargetDefeated = (target: Skeleton): void => {
        this.lootManager.handleKillRewards(target, this.player, this.callbacks, this.turnManager.getPlayerSideParticipantCount());
    };

    private handlePotionUse(fromBattleControls: boolean, usePotion: () => boolean, emptyMessage: string, successMessage: string): void {
        const inBattle = this.stateMachine.isInState('BATTLE');
        if (fromBattleControls && !inBattle) {return;}
        if (inBattle && !this.canUseBattleTurnInput()) {return;}
        if (!usePotion()) {this.callbacks.onAddBattleLog(emptyMessage, 'system'); this.callbacks.onUpdateHUD(); return;}

        this.callbacks.onAddBattleLog(successMessage, inBattle ? 'player' : 'system');
        this.callbacks.onUpdateHUD();
        if (!inBattle) {return;}

        this.beginPlayerAction();
        this.finishPlayerAction(timingConfig.battle.playerActionDelay);
    }
}
