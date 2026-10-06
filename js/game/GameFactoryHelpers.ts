import WorldMap from '../systems/world/worldMap/WorldMap.js';
import BattleMap from '../systems/combat/BattleMap.js';
import TurnManager from '../systems/combat/TurnManager.js';
import EncounterSystem from '../systems/encounter/EncounterSystem.js';
import VillagePopulation from '../systems/village/VillagePopulation.js';
import VillageActionsController from '../systems/village/VillageActionsController.js';
import VillageEnvironmentRenderer from '../systems/village/VillageEnvironmentRenderer.js';
import VillageLifeRenderer from '../systems/village/life/VillageLifeRenderer.js';
import HudController from '../systems/controllers/HudController.js';
import BattleUiController from '../systems/controllers/BattleUiController.js';
import Player from '../entities/player/Player.js';
import GameUiFactory from '../systems/game/ui/GameUiFactory.js';
import { MODES } from '../systems/game/runtime/GameModeStateMachine.js';
import GameVillageCoordinator from '../systems/game/runtime/GameVillageCoordinator.js';
import GameHudCoordinator from '../systems/game/runtime/GameHudCoordinator.js';
import MagicSystem from '../systems/controllers/magic/MagicSystem.js';
import LoreBookController from '../systems/controllers/lore/LoreBookController.js';
import { consumeNextCharacterRollAllocation } from '../utils/NextCharacterRollConfig.js';
import { balanceConfig } from '../config/balance/balanceConfig.js';
import { initializeWorldMonsterBehaviorCodex } from '../systems/combat/MonsterBehaviorDirector.js';
import { GameFacade } from './GameFacade.js';
import GameRuntimeStateMachineFactory from './runtime/GameRuntimeStateMachineFactory.js';
import { GameStartupState } from './runtime/GamePersistenceRuntime.js';

export type RuntimeUi = ReturnType<GameUiFactory['create']>;
export type RuntimeStateMachine = ReturnType<typeof GameRuntimeStateMachineFactory.create>;
type WorldTimeSnapshot = { clock: string; date: string; calendarTitle: string; calendarLines: string[] };

export const createPlayer = (startupState: GameStartupState): Player => startupState.mode === 'restore'
    ? Player.fromSavedState(startupState.save.player)
    : Player.createNew(0, 0, {
        startingSkillAllocation: consumeNextCharacterRollAllocation(balanceConfig.player.initialRandomAllocatedSkillPoints ?? 0),
    });

export const createRuntimeBase = (startupState: GameStartupState, worldColumns: number, worldRows: number, worldCellSize: number) => {
    initializeWorldMonsterBehaviorCodex();
    const player = createPlayer(startupState);
    const worldMap = startupState.mode === 'restore'
        ? WorldMap.fromSavedState(worldColumns, worldRows, worldCellSize, startupState.save.worldMap)
        : WorldMap.createNew(worldColumns, worldRows, worldCellSize);
    const [playerX, playerY] = worldMap.getPlayerPixelPosition();
    player.x = playerX;
    player.y = playerY;
    return {
        player,
        worldMap,
        battleMap: new BattleMap(),
        turnManager: new TurnManager(),
        encounterSystem: new EncounterSystem(),
        villageLifeRenderer: new VillageLifeRenderer(new VillagePopulation()),
        ui: new GameUiFactory().create(),
    };
};

// eslint-disable-next-line style-guide/function-length-warning
const createVillageActionsController = (
    game: GameFacade,
    ui: RuntimeUi,
    player: Player,
    worldMap: WorldMap,
    hudCoordinator: GameHudCoordinator,
    nextCharacterName: () => string,
): VillageActionsController => new VillageActionsController(player, ui.villageUI, ui.gameLogUI.log, {
    onUpdateHUD: () => hudCoordinator.updateHUD(),
    onAdvanceTime: (minutes, fatigueScale) => game.onVillageAdvanceTime(minutes, fatigueScale),
    onLeaveVillage: () => game.onVillageLeave(),
    getVillageDirectionHint: (name: string) => worldMap.getVillageDirectionHintFromPlayer(name),
    getAllVillagePlacements: () => worldMap.getAllVillagePlacements(),
    getNearbyVillageNames: (villageName: string, maxDistanceCells: number) =>
        worldMap.getNearbyVillagesFromVillage(villageName, maxDistanceCells).map((entry) => entry.name),
    getKnownSettlementNames: () => worldMap.getKnownSettlementNames(),
    getKnownQuestSettlementNames: () => game.questRuntime.getKnownQuestLocationNames(),
    getNpcCapabilities: (npcId, villageName) => game.worldSimulationRuntime.getNpcCapabilities(npcId, villageName),
    getNpcWorldState: (npcId) => game.worldSimulationRuntime.getNpcState(npcId),
    onNpcRosterEntryChanged: (entry) => {
        const placement = entry.passport.tileCol !== null && entry.passport.tileRow !== null
            ? { col: entry.passport.tileCol, row: entry.passport.tileRow }
            : worldMap.getAllVillagePlacements().find((candidate) => candidate.name === entry.passport.villageName);
        if (!placement) {return;}
        game.worldSimulationRuntime.upsertNpc({
            npcId: entry.passport.id,
            homeVillageName: entry.passport.villageName,
            role: entry.passport.occupation,
            lifeStatus: entry.lifeStatus,
            homeCell: { col: placement.col, row: placement.row },
            identity: {
                displayName: entry.passport.name,
                look: entry.passport.look,
                speechStyle: entry.passport.speechStyle,
                disposition: entry.passport.personality,
                settlementKnowledgeRadiusCells: entry.passport.settlementKnowledgeRadiusCells,
                sourceTag: entry.sourceTag,
            },
        });
    },
    onClearNpcRoster: () => game.worldSimulationRuntime.clearNpcs(),
    onVillageBarterCompleted: (trader, item, village) => game.onVillageBarterCompleted(trader, item, village),
    onTryRecruitEscort: (personName, villageName) => game.onTryRecruitEscort(personName, villageName),
    onRevealRecoverHolder: (villageName, npcName) => game.onRevealRecoverHolder(villageName, npcName),
    onTryStartRecoverConfrontation: (personName, villageName) => game.onTryStartRecoverConfrontation(personName, villageName),
    onStartBattle: (enemies) => game.stateMachine.transition(MODES.BATTLE, { enemies, terrainType: 'grass' }),
    onTryStartDefend: (npcName, villageName, villagerNames) => game.onTryStartDefendObjective(npcName, villageName, villagerNames),
    initializeVillageSideQuestOffers: (villageName, npcQuestOfferRolls) => game.initializeVillageSideQuestOffers(villageName, npcQuestOfferRolls),
    getVillageSideQuestOffers: (villageName, npcName) => game.getVillageSideQuestOffers(villageName, npcName),
    getVillageNpcActiveSideQuests: (villageName, npcName) => game.getVillageNpcActiveSideQuests(villageName, npcName),
    getActiveSideQuests: () => game.getActiveSideQuests(),
    acceptSideQuest: (questId) => game.acceptSideQuest(questId),
    markSideQuestReadyToTurnIn: (questId) => game.markSideQuestReadyToTurnIn(questId),
    turnInSideQuest: (questId, npcName, villageName) => game.turnInSideQuest(questId, npcName, villageName),
}, { nextCharacterName });

// eslint-disable-next-line style-guide/function-length-warning
export function createVillageRuntime(
    game: GameFacade,
    ui: RuntimeUi,
    player: Player,
    worldMap: WorldMap,
    villageLifeRenderer: VillageLifeRenderer,
    hudCoordinator: GameHudCoordinator,
    nextCharacterName: () => string,
) {
    const villageActionsController = createVillageActionsController(game, ui, player, worldMap, hudCoordinator, nextCharacterName);
    const villageCoordinator = new GameVillageCoordinator(
        ui.hudElements,
        ui.battleUI,
        ui.villageUI,
        ui.worldUI,
        villageLifeRenderer,
        villageActionsController,
    );
    const stateMachine = GameRuntimeStateMachineFactory.create(game, ui, worldMap, villageCoordinator);
    return { villageActionsController, villageCoordinator, stateMachine };
}

// eslint-disable-next-line style-guide/function-length-warning
export const createHudCoordinator = (
    player: Player,
    ui: RuntimeUi,
    magicSystem: MagicSystem,
    battleUiController: BattleUiController,
    loreBookController: LoreBookController,
    onEquipmentAction: (action: string) => boolean,
    getWorldTimeSnapshot: () => WorldTimeSnapshot,
): GameHudCoordinator => new GameHudCoordinator(
    player,
    new HudController(
        player,
        ui.hudElements,
        ui.battleUI,
        magicSystem,
        ui.gameLogUI.log,
        loreBookController,
        onEquipmentAction,
        getWorldTimeSnapshot,
    ),
    battleUiController,
    magicSystem,
);

export const createRenderRouter = (
    game: GameFacade,
    worldMap: WorldMap,
    player: Player,
    battleMap: BattleMap,
    turnManager: TurnManager,
    villageLifeRenderer: VillageLifeRenderer,
) => ({
    canvas: game.canvas,
    renderer: game.renderer,
    worldMap,
    player,
    battleMap,
    turnManager,
    villageEnvironmentRenderer: new VillageEnvironmentRenderer(),
    villageLifeRenderer,
});
