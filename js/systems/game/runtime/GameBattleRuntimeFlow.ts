import StateMachine from '../../../utils/StateMachine.js';
import { TerrainType } from '../../../types/game.js';
import Skeleton from '../../../entities/Skeleton.js';
import { BattleSplash } from '../../../ui/BattleSplash.js';
import BattleMap from '../../combat/BattleMap.js';
import TurnManager from '../../combat/TurnManager.js';
import Player from '../../../entities/player/Player.js';
import BattlePlayerActionController from '../BattlePlayerActionController.js';
import BattleCommandController from '../BattleCommandController.js';
import { HudElements, BattleUI, VillageUI, WorldUI } from '../ui/GameUiTypes.js';
import { MODES } from './GameModeStateMachine.js';

export type GameBattleRuntimeCallbacks = {
    onClearBattleLog: () => void;
    onAddBattleLog: (message: string, type?: string) => void;
    onUpdateHUD: () => void;
    onDescribeEncounter: (enemies: Skeleton[]) => string;
    onGameOver: () => void;
    onBattleEnded: (result: 'victory' | 'defeat' | 'fled') => void;
};

type Controllers = {
    battlePlayerActionController: BattlePlayerActionController;
    battleCommandController: BattleCommandController;
};

type Deps = {
    stateMachine: StateMachine;
    player: Player;
    battleMap: BattleMap;
    turnManager: TurnManager;
    battleSplash: BattleSplash;
    hudElements: HudElements;
    battleUI: BattleUI;
    villageUI: VillageUI;
    worldUI: WorldUI;
    callbacks: GameBattleRuntimeCallbacks;
    controllers: Controllers;
    onStartBattle: () => void;
};

export default class GameBattleRuntimeFlow {
    private readonly deps: Deps;
    private turnTransitioning = false;
    private currentEnemies: Skeleton[] = [];
    private currentAllies: Skeleton[] = [];
    private currentTerrainType: TerrainType = 'grass';
    private currentBattleKind: 'default' | 'village-defense' = 'default';
    private currentVillageName: string | null = null;

    constructor(deps: Deps) {
        this.deps = deps;
    }

    public enterBattleMode(
        enemies: Skeleton[],
        terrainType: TerrainType = 'grass',
        allies: Skeleton[] = [],
        battleKind: 'default' | 'village-defense' = 'default',
        villageName?: string,
    ): void {
        this.turnTransitioning = true;
        this.deps.hudElements.modeIndicator.textContent = 'Battle!';
        this.deps.worldUI.sidebar.classList.add('hidden');
        this.deps.battleUI.sidebar.classList.remove('hidden');
        this.deps.villageUI.sidebar.classList.add('hidden');
        this.deps.villageUI.actions.classList.add('hidden');
        this.deps.villageUI.rumorsPanel.classList.add('hidden');
        this.deps.controllers.battleCommandController.clearPendingLoot();
        this.currentEnemies = enemies;
        this.currentAllies = allies;
        this.currentTerrainType = terrainType;
        this.currentBattleKind = battleKind;
        this.currentVillageName = villageName ?? null;
        this.deps.controllers.battlePlayerActionController.setSelectedEnemy(null);
        this.deps.battleMap.clearSelectedCell();
        this.deps.battleSplash.showBattleStart(enemies.length, this.deps.onStartBattle);
    }

    public endBattle(result: 'victory' | 'defeat' | 'fled'): void {
        this.turnTransitioning = true;
        this.deps.callbacks.onBattleEnded(result);
        if (result === 'fled') {
            this.deps.controllers.battleCommandController.clearPendingLoot();
            this.deps.stateMachine.transition(this.currentBattleKind === 'village-defense' ? MODES.VILLAGE : MODES.WORLD_MAP);
            return;
        }
        if (result === 'defeat') {
            this.deps.controllers.battleCommandController.clearPendingLoot();
            this.deps.callbacks.onAddBattleLog('Game Over!', 'system');
            this.deps.battleSplash.showBattleEnd('defeat', () => this.deps.callbacks.onGameOver());
            return;
        }
        this.deps.controllers.battleCommandController.resolvePendingLoot();
        this.deps.callbacks.onAddBattleLog('Victory!', 'system');
        this.deps.battleSplash.showBattleEnd(
            'victory',
            () => this.deps.stateMachine.transition(this.currentBattleKind === 'village-defense' ? MODES.VILLAGE : MODES.WORLD_MAP),
        );
    }

    public startBattle(): void {
        this.deps.battleMap.setup(this.deps.player, this.currentEnemies, this.currentTerrainType, this.currentAllies);
        this.deps.turnManager.initializeTurns([this.deps.player, ...this.currentAllies, ...this.currentEnemies], {
            player: this.deps.player,
            allies: this.currentAllies,
            enemies: this.currentEnemies,
        });
        this.turnTransitioning = false;
        this.deps.callbacks.onClearBattleLog();
        const encounter = this.deps.callbacks.onDescribeEncounter(this.currentEnemies);
        this.deps.callbacks.onAddBattleLog(`Encountered ${encounter}!`, 'system');
        this.deps.callbacks.onUpdateHUD();
    }

    public exitBattleMode(): void {
        this.turnTransitioning = false;
        this.currentEnemies = [];
        this.currentAllies = [];
        this.currentTerrainType = 'grass';
        this.currentBattleKind = 'default';
        this.currentVillageName = null;
        this.deps.battleMap.clearSelectedCell();
    }

    public setTurnTransitioning = (turnTransitioning: boolean): void => {
        this.turnTransitioning = turnTransitioning;
    };

    public isTurnTransitioning = (): boolean => this.turnTransitioning;

    public getCurrentEnemies = (): Skeleton[] => this.currentEnemies;

    public getCurrentAllies = (): Skeleton[] => this.currentAllies;

    public getBattleContext = (): { kind: 'default' | 'village-defense'; villageName: string | null } =>
        ({ kind: this.currentBattleKind, villageName: this.currentVillageName });
}
