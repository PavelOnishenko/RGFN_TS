import WorldMap from '../systems/world/worldMap/WorldMap.js';
import BattleMap from '../systems/combat/BattleMap.js';
import TurnManager from '../systems/combat/TurnManager.js';
import EncounterSystem from '../systems/encounter/EncounterSystem.js';
import WorldModeController from '../systems/world/worldMap/WorldModeController.js';
import Player from '../entities/player/Player.js';
import Skeleton from '../entities/Skeleton.js';
import { BattleSplash } from '../ui/BattleSplash.js';
import { ItemDiscoverySplash } from '../ui/ItemDiscoverySplash.js';
import BattleTurnController from '../systems/game/BattleTurnController.js';
import BattlePlayerActionController from '../systems/game/BattlePlayerActionController.js';
import BattleCommandController from '../systems/game/BattleCommandController.js';
import { MODES } from '../systems/game/runtime/GameModeStateMachine.js';
import GameHudCoordinator from '../systems/game/runtime/GameHudCoordinator.js';
import GameBattleCoordinator from '../systems/game/runtime/GameBattleCoordinator.js';
import MagicSystem from '../systems/controllers/magic/MagicSystem.js';
import LoreBookController from '../systems/controllers/lore/LoreBookController.js';
import BattleUiController from '../systems/controllers/BattleUiController.js';
import { TerrainType } from '../types/game.js';
import { GameFacade } from './GameFacade.js';
import { RuntimeStateMachine, RuntimeUi } from './GameFactoryHelpers.js';
import { FerryRouteOption } from '../systems/world-mode/WorldModeFerryPromptController.js';

export const createBattlePlayerActionController = (
    game: GameFacade,
    turnManager: TurnManager,
    battleUiController: BattleUiController,
    player: Player,
    hudCoordinator: GameHudCoordinator,
): BattlePlayerActionController => new BattlePlayerActionController(turnManager, battleUiController, player, {
    onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t),
    onEnableBattleButtons: (enabled) => hudCoordinator.enableBattleButtons(enabled),
    onProcessTurn: () => game.battleCoordinator.processTurn(),
    onPlayerTurnTransitionStart: () => game.battleCoordinator.onPlayerTurnTransitionStart(),
});

export const createBattleCommandController = (
    game: GameFacade,
    stateMachine: RuntimeStateMachine,
    player: Player,
    battleMap: BattleMap,
    turnManager: TurnManager,
    magicSystem: MagicSystem,
    hudCoordinator: GameHudCoordinator,
    battlePlayerActionController: BattlePlayerActionController,
): BattleCommandController => new BattleCommandController(stateMachine, player, battleMap, turnManager, magicSystem, {
    onUpdateHUD: () => hudCoordinator.updateHUD(),
    onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t),
    onEnableBattleButtons: (enabled) => hudCoordinator.enableBattleButtons(enabled),
    onProcessTurn: () => game.battleCoordinator.processTurn(),
    onEndBattle: (result) => game.battleCoordinator.endBattle(result),
    onPlayerTurnTransitionStart: () => game.battleCoordinator.onPlayerTurnTransitionStart(),
    onPlayerTurnReady: () => game.battleCoordinator.onPlayerTurnReady(),
    getSelectedEnemy: () => battlePlayerActionController.getSelectedEnemy(),
    setSelectedEnemy: (enemy: Skeleton | null) => battlePlayerActionController.setSelectedEnemy(enemy),
    onEnemyDefeated: (enemy: Skeleton) => game.onMonsterKilled(enemy.name),
});

export const createBattleTurnController = (
    game: GameFacade,
    battleMap: BattleMap,
    turnManager: TurnManager,
    player: Player,
    hudCoordinator: GameHudCoordinator,
): BattleTurnController => new BattleTurnController(battleMap, turnManager, player, {
    onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t),
    onUpdateHUD: () => hudCoordinator.updateHUD(),
    onEnableBattleButtons: (enabled) => hudCoordinator.enableBattleButtons(enabled),
    onBattleEnd: (result) => game.battleCoordinator.endBattle(result),
    onPlayerTurnReady: () => game.battleCoordinator.onPlayerTurnReady(),
    onTryApplyEscortDamage: (enemyName, damage) => game.questRuntime.applyEscortBattleDamage(enemyName, damage),
});

export const createBattleCoordinator = (
    game: GameFacade,
    stateMachine: RuntimeStateMachine,
    player: Player,
    battleMap: BattleMap,
    turnManager: TurnManager,
    ui: RuntimeUi,
    hudCoordinator: GameHudCoordinator,
    battlePlayerActionController: BattlePlayerActionController,
    battleCommandController: BattleCommandController,
    battleTurnController: BattleTurnController,
): GameBattleCoordinator => new GameBattleCoordinator(
    game.input,
    stateMachine,
    {
        player,
        battleMap,
        turnManager,
        battleSplash: new BattleSplash(),
        hudElements: ui.hudElements,
        battleUI: ui.battleUI,
        villageUI: ui.villageUI,
        worldUI: ui.worldUI,
    },
    { battlePlayerActionController, battleCommandController, battleTurnController },
    {
        onClearBattleLog: () => hudCoordinator.clearBattleLog(),
        onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t),
        onUpdateHUD: () => hudCoordinator.updateHUD(),
        onDescribeEncounter: (enemies) => hudCoordinator.describeEncounter(enemies),
        onGameOver: () => game.gameOver(),
        onBattleEnded: (result) => game.onBattleEnded(result),
    },
);

export const createWorldModeControllerRuntime = (
    game: GameFacade,
    player: Player,
    worldMap: WorldMap,
    encounterSystem: EncounterSystem,
    stateMachine: RuntimeStateMachine,
    ui: RuntimeUi,
    hudCoordinator: GameHudCoordinator,
    loreBookController: LoreBookController,
): WorldModeController => new WorldModeController(game.input, player, worldMap, encounterSystem, new ItemDiscoverySplash(), {
    onEnterVillage: () => stateMachine.transition(MODES.VILLAGE),
    onRequestVillageEntryPrompt: (name, anchor) => game.showVillageEntryPrompt(ui.worldUI, name, anchor),
    onCloseVillageEntryPrompt: () => game.hideVillageEntryPrompt(ui.worldUI),
    onRequestFerryPrompt: (options: FerryRouteOption[], selectedRouteIndex: number, anchor) => game.showFerryPrompt(ui.worldUI, options, selectedRouteIndex, anchor),
    onCloseFerryPrompt: () => game.hideFerryPrompt(ui.worldUI),
    onStartBattle: (enemies: Skeleton[], terrainType: TerrainType) => stateMachine.transition(MODES.BATTLE, { enemies, terrainType }),
    onAddBattleLog: (m, t = 'system') => hudCoordinator.addBattleLog(m, t),
    onUpdateHUD: () => hudCoordinator.updateHUD(),
    onAdvanceTime: (minutes, fatigueScale) => game.advanceTime(minutes, fatigueScale),
    isNightTime: () => game.isNightTime(),
    onRememberTraveler: (traveler, disposition) => loreBookController.rememberTraveler(traveler, disposition),
    getQuestBattleEncounter: () => game.tryCreateQuestMonsterEncounter(),
});
