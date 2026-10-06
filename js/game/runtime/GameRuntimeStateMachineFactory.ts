import StateMachine from '../../utils/StateMachine.js';
import WorldMap from '../../systems/world/worldMap/WorldMap.js';
import Skeleton from '../../entities/Skeleton.js';
import { TerrainType } from '../../types/game.js';
import GameModeStateMachine from '../../systems/game/runtime/GameModeStateMachine.js';
import GameVillageCoordinator from '../../systems/game/runtime/GameVillageCoordinator.js';
import { GameFacade, UIBundle } from '../GameFacade.js';

export default class GameRuntimeStateMachineFactory {
    public static readonly create = (game: GameFacade, ui: UIBundle, worldMap: WorldMap, villageCoordinator: GameVillageCoordinator): StateMachine =>
        new GameModeStateMachine<{ enemies: Skeleton[]; allies?: Skeleton[]; terrainType: TerrainType; battleKind?: 'default' | 'village-defense'; villageName?: string }>({
            onEnterWorld: () => game.worldModeController.enterWorldMode(
                ui.hudElements.modeIndicator,
                ui.worldUI.sidebar,
                ui.battleUI.sidebar,
                ui.villageUI.sidebar,
                ui.villageUI.actions,
                ui.villageUI.rumorsPanel,
            ),
            onUpdateWorld: () => game.worldModeController.updateWorldMode(),
            onEnterBattle: (battleData) => game.battleCoordinator.enterBattleMode(
                battleData.enemies,
                battleData.terrainType,
                battleData.allies ?? [],
                battleData.battleKind ?? 'default',
                battleData.villageName,
            ),
            onUpdateBattle: () => game.battleCoordinator.updateBattleMode(),
            onExitBattle: () => game.battleCoordinator.exitBattleMode(),
            onEnterVillage: () => game.onVillageEntered(worldMap, villageCoordinator),
            onExitVillage: () => villageCoordinator.exitVillageMode(),
        }).create();
}
