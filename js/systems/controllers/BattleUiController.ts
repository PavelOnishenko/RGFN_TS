import BattleMap from '../combat/BattleMap.js';
import TurnManager from '../combat/TurnManager.js';
import Player from '../../entities/player/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import { Direction } from '../../types/game.js';
import MagicSystem from './magic/MagicSystem.js';
import BattleUiActionAvailability from '../battle-ui/BattleUiActionAvailability.js';
import BattleUiTargeting from '../battle-ui/BattleUiTargeting.js';
import { BattleUI, SelectionResult } from '../battle-ui/BattleUiTypes.js';

export default class BattleUiController {
    private gameLog: HTMLElement;
    private targeting: BattleUiTargeting;
    private actionAvailability: BattleUiActionAvailability;

    constructor(battleUI: BattleUI, battleMap: BattleMap, turnManager: TurnManager, player: Player, gameLog: HTMLElement, magicSystem: MagicSystem) {
        this.gameLog = gameLog;
        this.targeting = new BattleUiTargeting(battleUI, battleMap, turnManager, player);
        this.actionAvailability = new BattleUiActionAvailability(battleUI, battleMap, player, magicSystem, this.targeting);
    }

    public updateEnemyDisplay(selectedEnemy: Skeleton | null): Skeleton | null {
        this.refreshActionAvailability();
        return this.targeting.updateEnemyDisplay(selectedEnemy);
    }

    public handleMovementOrSelection = (direction: Direction, selectedEnemy: Skeleton | null): SelectionResult =>
        this.targeting.handleMovementOrSelection(direction, selectedEnemy);

    public selectEnemyFromCanvasClick = (event: MouseEvent, canvas: HTMLCanvasElement): Skeleton | null => this.targeting.selectEnemyFromCanvasClick(event, canvas);

    public setButtonsEnabled(enabled: boolean): void {
        this.actionAvailability.setButtonsEnabled(enabled);
    }

    public refreshActionAvailability(): void {
        this.actionAvailability.refreshActionAvailability();
    }

    public addBattleLog(message: string, type: string = 'system'): void {
        const div = document.createElement('div');
        div.textContent = message;
        div.classList.add(type + '-action');
        this.gameLog.appendChild(div);
        this.gameLog.scrollTop = this.gameLog.scrollHeight;
    }

    public clearBattleLog = (): void => {
        this.gameLog.innerHTML = '';
    };

    public describeEncounter(enemies: Skeleton[]): string {
        if (enemies.length === 0) {
            return 'nothing';
        }

        if (enemies.length === 1) {
            return this.describeEnemy(enemies[0]);
        }

        return `${enemies.length} ${enemies[0].name}s`;
    }

    private describeEnemy(enemy: Skeleton): string {
        const maybeDetailedEnemy = enemy as Skeleton & { getEncounterDescription?: () => string };
        if (typeof maybeDetailedEnemy.getEncounterDescription !== 'function') {
            return enemy.name;
        }

        return `${enemy.name}. ${maybeDetailedEnemy.getEncounterDescription()}`;
    }
}
