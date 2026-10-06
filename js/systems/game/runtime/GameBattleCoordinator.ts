import InputManager from '../../InputManager.js';
import StateMachine from '../../../utils/StateMachine.js';
import { Direction, TerrainType } from '../../../types/game.js';
import Skeleton from '../../../entities/Skeleton.js';
import BattleMap from '../../combat/BattleMap.js';
import TurnManager from '../../combat/TurnManager.js';
import Player from '../../../entities/player/Player.js';
import BattlePlayerActionController from '../BattlePlayerActionController.js';
import BattleCommandController from '../BattleCommandController.js';
import BattleTurnController from '../BattleTurnController.js';
import { BattleUI, HudElements, VillageUI, WorldUI } from '../ui/GameUiTypes.js';
import { MODES } from './GameModeStateMachine.js';
import { BaseSpellId } from '../../controllers/magic/MagicSystem.js';
import { CombatMove } from '../../combat/DirectionalCombat.js';
import GameBattleRuntimeFlow, { GameBattleRuntimeCallbacks } from './GameBattleRuntimeFlow.js';
import { BattleSplash } from '../../../ui/BattleSplash.js';

type Controllers = {
    battlePlayerActionController: BattlePlayerActionController;
    battleCommandController: BattleCommandController;
    battleTurnController: BattleTurnController;
};

export default class GameBattleCoordinator {
    private readonly input: InputManager;
    private readonly stateMachine: StateMachine;
    private readonly turnManager: TurnManager;
    private readonly controllers: Controllers;
    private readonly runtimeFlow: GameBattleRuntimeFlow;

    constructor(
        input: InputManager,
        stateMachine: StateMachine,
        deps: {
            player: Player;
            battleMap: BattleMap;
            turnManager: TurnManager;
            battleSplash: BattleSplash;
            hudElements: HudElements;
            battleUI: BattleUI;
            villageUI: VillageUI;
            worldUI: WorldUI;
        },
        controllers: Controllers,
        callbacks: GameBattleRuntimeCallbacks,
    ) {
        this.input = input;
        this.stateMachine = stateMachine;
        this.turnManager = deps.turnManager;
        this.controllers = controllers;
        this.runtimeFlow = new GameBattleRuntimeFlow({ stateMachine, ...deps, callbacks, controllers, onStartBattle: () => this.startBattle() });
    }

    public enterBattleMode(
        enemies: Skeleton[],
        terrainType: TerrainType = 'grass',
        allies: Skeleton[] = [],
        battleKind: 'default' | 'village-defense' = 'default',
        villageName?: string,
    ): void {
        this.runtimeFlow.enterBattleMode(enemies, terrainType, allies, battleKind, villageName);
    }

    public updateBattleMode(): void {
        if (this.runtimeFlow.isTurnTransitioning()) {
            return;
        }
        this.controllers.battlePlayerActionController.updateBattleMode(() => this.getPressedDirection());
    }

    public handleCanvasClick(event: MouseEvent, canvas: HTMLCanvasElement): void {
        if (!this.stateMachine.isInState(MODES.BATTLE) || this.runtimeFlow.isTurnTransitioning()) {
            return;
        }
        this.controllers.battlePlayerActionController.handleCanvasClick(event, canvas);
    }

    public processTurn(): void {
        this.controllers.battleTurnController.processTurn();
    }

    public handleAttack(): void {
        if (this.runtimeFlow.isTurnTransitioning()) {
            return;
        }
        this.controllers.battleCommandController.handleAttack();
    }

    public handleDirectionalCombatMove(move: CombatMove): void {
        if (this.runtimeFlow.isTurnTransitioning()) {
            return;
        }
        this.controllers.battleCommandController.handleDirectionalCombatMove(move);
    }

    public handleCastSpell(spellId: BaseSpellId): void {
        if (this.runtimeFlow.isTurnTransitioning()) {
            return;
        }
        this.controllers.battleCommandController.handleCastSpell(spellId);
    }

    public handleFlee(): void {
        if (this.runtimeFlow.isTurnTransitioning()) {
            return;
        }
        this.controllers.battleCommandController.handleFlee();
    }

    public handleWait(): void {
        if (this.runtimeFlow.isTurnTransitioning()) {
            return;
        }
        this.controllers.battleCommandController.handleWait();
    }

    public handleUseManaPotion(fromBattleControls: boolean): void {
        if (this.runtimeFlow.isTurnTransitioning() && this.stateMachine.isInState(MODES.BATTLE)) {
            return;
        }
        this.controllers.battleCommandController.handleUseManaPotion(fromBattleControls);
    }

    public handleUsePotion(fromBattleControls: boolean): void {
        if (this.runtimeFlow.isTurnTransitioning() && this.stateMachine.isInState(MODES.BATTLE)) {
            return;
        }
        this.controllers.battleCommandController.handleUsePotion(fromBattleControls);
    }

    public onPlayerTurnTransitionStart = (): void => {
        this.runtimeFlow.setTurnTransitioning(true);
    };

    public onPlayerTurnReady(): void {
        this.runtimeFlow.setTurnTransitioning(false);
        this.turnManager.waitingForPlayer = true;
        this.controllers.battlePlayerActionController.updateBattleUI();
    }

    public endBattle(result: 'victory' | 'defeat' | 'fled'): void {
        this.runtimeFlow.endBattle(result);
    }

    public exitBattleMode(): void {
        this.runtimeFlow.exitBattleMode();
    }

    public getCurrentEnemies = (): Skeleton[] => this.runtimeFlow.getCurrentEnemies();
    public getCurrentAllies = (): Skeleton[] => this.runtimeFlow.getCurrentAllies();
    public getBattleContext = (): { kind: 'default' | 'village-defense'; villageName: string | null } => this.runtimeFlow.getBattleContext();

    public getSelectedEnemy = (): Skeleton | null => this.controllers.battlePlayerActionController.getSelectedEnemy();

    private startBattle(): void {
        this.runtimeFlow.startBattle();
        this.processTurn();
    }

    private getPressedDirection(): Direction | null {
        if (this.input.wasActionPressed('moveUp')) {
            return 'up';
        }
        if (this.input.wasActionPressed('moveDown')) {
            return 'down';
        }
        if (this.input.wasActionPressed('moveLeft')) {
            return 'left';
        }
        if (this.input.wasActionPressed('moveRight')) {
            return 'right';
        }
        return null;
    }
}
