import TurnManager from '../combat/TurnManager.js';
import BattleUiController from '../controllers/BattleUiController.js';
import Skeleton from '../../entities/Skeleton.js';
import timingConfig from '../../config/timingConfig.js';
import { Direction } from '../../types/game.js';
import Player from '../../entities/player/Player.js';

type BattlePlayerActionCallbacks = {
    onAddBattleLog: (message: string, type?: string) => void;
    onEnableBattleButtons: (enabled: boolean) => void;
    onProcessTurn: () => void;
    onPlayerTurnTransitionStart: () => void;
};

export default class BattlePlayerActionController {
    private turnManager: TurnManager;
    private battleUiController: BattleUiController;
    private player: Player;
    private callbacks: BattlePlayerActionCallbacks;
    private selectedEnemy: Skeleton | null;

    constructor(turnManager: TurnManager, battleUiController: BattleUiController, player: Player, callbacks: BattlePlayerActionCallbacks) {
        this.turnManager = turnManager;
        this.battleUiController = battleUiController;
        this.player = player;
        this.callbacks = callbacks;
        this.selectedEnemy = null;
    }

    public setSelectedEnemy = (enemy: Skeleton | null): void => {
        this.selectedEnemy = enemy;
    };

    public getSelectedEnemy = (): Skeleton | null => this.selectedEnemy;

    public handleMovementOrSelection(direction: Direction): boolean {
        const result = this.battleUiController.handleMovementOrSelection(direction, this.selectedEnemy);
        if (!result.moved && result.selectedEnemy) {
            this.selectedEnemy = result.selectedEnemy;
            this.updateBattleUI();
            this.callbacks.onAddBattleLog(`Selected ${result.selectedEnemy.name}`, 'system');
        }

        return result.moved;
    }

    public updateBattleMode(inputDirectionProvider: () => Direction | null): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }

        const direction = inputDirectionProvider();
        if (!direction || !this.handleMovementOrSelection(direction)) {
            return;
        }

        this.callbacks.onAddBattleLog('You moved.', 'player');
        this.player.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.playerActionDelay);
    }

    public handleCanvasClick(event: MouseEvent, canvas: HTMLCanvasElement): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }

        const selectedEnemy = this.battleUiController.selectEnemyFromCanvasClick(event, canvas);
        if (!selectedEnemy) {
            return;
        }

        this.selectedEnemy = selectedEnemy;
        this.updateBattleUI();
        this.callbacks.onAddBattleLog(`Selected ${selectedEnemy.name}`, 'system');
    }

    public updateBattleUI = (): void => {
        this.selectedEnemy = this.battleUiController.updateEnemyDisplay(this.selectedEnemy);
    };

    private canUseBattleTurnInput = (): boolean => this.turnManager.isPlayerTurn() && this.turnManager.waitingForPlayer;
}
