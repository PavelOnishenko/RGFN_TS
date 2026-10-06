/* eslint-disable style-guide/file-length-warning */
import WorldMap from '../systems/world/worldMap/WorldMap.js';
import BattleMap from '../systems/combat/BattleMap.js';
import TurnManager from '../systems/combat/TurnManager.js';
import EncounterSystem from '../systems/encounter/EncounterSystem.js';
import VillageLifeRenderer from '../systems/village/life/VillageLifeRenderer.js';
import DeveloperEventController from '../systems/encounter/DeveloperEventController.js';
import BattleUiController from '../systems/controllers/BattleUiController.js';
import LoreBookController from '../systems/controllers/lore/LoreBookController.js';
import MagicSystem from '../systems/controllers/magic/MagicSystem.js';
import QuestGenerator from '../systems/quest/QuestGenerator.js';
import QuestPackService from '../systems/quest/generation/QuestPackService.js';
import QuestCharacterNameReservoir from '../systems/quest/generation/QuestCharacterNameReservoir.js';
import QuestUiController from '../systems/quest/ui/QuestUiController.js';
import GameRenderRouter from '../systems/game/runtime/GameRenderRouter.js';
import BattleCommandController from '../systems/game/BattleCommandController.js';
import GameRuntimeUiBinder from './runtime/GameRuntimeUiBinder.js';
import { GameFacade } from './GameFacade.js';
import { RuntimeUi, createHudCoordinator, createRenderRouter, createRuntimeBase, createVillageRuntime } from './GameFactoryHelpers.js';
import { createBattleCommandController, createBattleCoordinator, createBattlePlayerActionController, createBattleTurnController, createWorldModeControllerRuntime } from './GameFactoryBattleHelpers.js';
import { isDeveloperModeEnabled } from '../utils/DeveloperModeConfig.js';
import { GameStartupState } from './runtime/GamePersistenceRuntime.js';

type RuntimeBase = {
    player: any;
    worldMap: WorldMap;
    battleMap: BattleMap;
    turnManager: TurnManager;
    encounterSystem: EncounterSystem;
    villageLifeRenderer: VillageLifeRenderer;
    ui: RuntimeUi;
};

type SharedRuntime = ReturnType<typeof createSharedRuntime>;
type RuntimeControllers = ReturnType<typeof createRuntimeControllers>;

// eslint-disable-next-line style-guide/function-length-warning
const getSideQuestFilterElements = (): {
    sideFilterContainer: HTMLElement;
    sideFilterButton: HTMLButtonElement;
    sideFilterPopup: HTMLElement;
    sideFilterApplyButton: HTMLButtonElement;
    sideStatusFilterCheckboxes: {
        active: HTMLInputElement;
        available: HTMLInputElement;
        readyToTurnIn: HTMLInputElement;
        completed: HTMLInputElement;
    };
} => ({
    sideFilterContainer: document.getElementById('quests-side-filter-controls')! as HTMLElement,
    sideFilterButton: document.getElementById('quests-side-filter-btn')! as HTMLButtonElement,
    sideFilterPopup: document.getElementById('quests-side-filter-popup')! as HTMLElement,
    sideFilterApplyButton: document.getElementById('quests-side-filter-apply-btn')! as HTMLButtonElement,
    sideStatusFilterCheckboxes: {
        active: document.getElementById('quests-side-filter-status-active')! as HTMLInputElement,
        available: document.getElementById('quests-side-filter-status-available')! as HTMLInputElement,
        readyToTurnIn: document.getElementById('quests-side-filter-status-ready')! as HTMLInputElement,
        completed: document.getElementById('quests-side-filter-status-completed')! as HTMLInputElement,
    },
});

// eslint-disable-next-line style-guide/function-length-warning
const createQuestUiController = (game: GameFacade, ui: RuntimeUi): QuestUiController => {
    const sideFilterElements = getSideQuestFilterElements();
    return new QuestUiController(
        ui.hudElements.questsTitle,
        document.getElementById('quests-tab-main-btn')! as HTMLButtonElement,
        document.getElementById('quests-tab-side-btn')! as HTMLButtonElement,
        ui.hudElements.questsKnownOnlyToggle,
        document.getElementById('quests-mode-toggle')! as HTMLElement,
        document.getElementById('quests-mode-toggle-label')! as HTMLElement,
        sideFilterElements.sideFilterContainer,
        sideFilterElements.sideFilterButton,
        sideFilterElements.sideFilterPopup,
        sideFilterElements.sideFilterApplyButton,
        sideFilterElements.sideStatusFilterCheckboxes,
        ui.hudElements.questsBody,
        ui.hudElements.questIntroModal,
        ui.hudElements.questIntroBody,
        ui.hudElements.questIntroCloseBtn,
        {
            onLocationClick: (locationName: string) => game.onQuestLocationClick(locationName),
            isDeveloperModeEnabled,
            onRegenerateSideQuest: (questId: string) => game.regenerateSideQuest(questId),
        },
    );
};

const createQuestGenerator = (worldMap: WorldMap, packService: QuestPackService): QuestGenerator => new QuestGenerator({
    packService,
    nearbyVillagesProvider: (villageName: string, maxDistanceCells: number) =>
        worldMap.getNearbyVillagesFromVillage(villageName, maxDistanceCells),
    villageDirectionHintProvider: (villageName: string) => worldMap.getVillageDirectionHintFromPlayer(villageName),
});

// eslint-disable-next-line style-guide/function-length-warning
const createDevController = (
    ui: RuntimeUi,
    encounterSystem: EncounterSystem,
    worldMap: WorldMap,
    worldInteractionRuntime: GameFacade['worldInteractionRuntime'],
    getWorldSimulationOverview: () => ReturnType<GameFacade['getWorldSimulationState']>,
    getPersistenceOverview: () => ReturnType<GameFacade['getPersistenceOverview']>,
    villageActionsController: { addLog: (message: string, type?: string) => void },
    villageCoordinator: { getDeveloperEventLabel: (type: string) => string },
): DeveloperEventController => new DeveloperEventController(ui.developerUI, encounterSystem, {
    addVillageLog: (m, t = 'system') => villageActionsController.addLog(m, t),
    getEventLabel: (type) => villageCoordinator.getDeveloperEventLabel(type),
    getMapDisplayConfig: () => worldMap.getMapDisplayConfig(),
    setMapDisplayConfig: (config) => worldMap.setMapDisplayConfig(config),
    setWorldMapDrawProfilingEnabled: (enabled) => worldMap.setDrawProfilingEnabled(enabled),
    isWorldMapDrawProfilingEnabled: () => worldMap.isDrawProfilingEnabled(),
    resetWorldMapDrawProfiling: () => worldMap.resetDrawProfiling(),
    getWorldMapDrawProfilingSnapshot: () => worldMap.getDrawProfilingSnapshot(),
    setWorldMapRenderLayerToggles: (toggles) => worldMap.setRenderLayerToggles(toggles),
    getWorldMapRenderLayerToggles: () => worldMap.getRenderLayerToggles(),
    getWorldMapPerformanceSnapshot: () => worldMap.getPerformanceSnapshot(),
    getWorldMapPointerSnapshot: () => worldInteractionRuntime.getPointerDiagnosticsSnapshot(),
    setWorldMapRenderFpsCap: (cap) => worldMap.setRenderFpsCap(cap),
    getWorldMapRenderFpsCap: () => worldMap.getRenderFpsCap(),
    setWorldMapDevicePixelRatioClamp: (clamp) => worldMap.setDevicePixelRatioClamp(clamp),
    getWorldMapDevicePixelRatioClamp: () => worldMap.getDevicePixelRatioClamp(),
    getWorldSimulationOverview,
    getPersistenceOverview,
});

// eslint-disable-next-line style-guide/function-length-warning
function createSharedRuntime(
    game: GameFacade,
    runtimeBase: RuntimeBase,
    loreBookController: LoreBookController,
    magicSystem: MagicSystem,
    battleUiController: BattleUiController,
    nextCharacterName: () => string,
) {
    const { player, ui, worldMap, villageLifeRenderer } = runtimeBase;
    let battleCommandControllerRef: BattleCommandController | null = null;
    const hudCoordinator = createHudCoordinator(
        player,
        ui,
        magicSystem,
        battleUiController,
        loreBookController,
        (action) => battleCommandControllerRef?.handleEquipmentAction(action) ?? true,
        () => game.getHudTimeSnapshot(),
    );
    const villageRuntime = createVillageRuntime(game, ui, player, worldMap, villageLifeRenderer, hudCoordinator, nextCharacterName);
    return { hudCoordinator, battleCommandControllerRef, ...villageRuntime };
}

// eslint-disable-next-line style-guide/function-length-warning
const createBattleControllers = (
    game: GameFacade,
    runtimeBase: RuntimeBase,
    shared: SharedRuntime,
    magicSystem: MagicSystem,
    battleUiController: BattleUiController,
) => {
    const { player, battleMap, turnManager, ui } = runtimeBase;
    const { hudCoordinator, stateMachine } = shared;
    const battlePlayerActionController = createBattlePlayerActionController(game, turnManager, battleUiController, player, hudCoordinator);
    const battleCommandController = createBattleCommandController(
        game,
        stateMachine,
        player,
        battleMap,
        turnManager,
        magicSystem,
        hudCoordinator,
        battlePlayerActionController,
    );
    const battleTurnController = createBattleTurnController(game, battleMap, turnManager, player, hudCoordinator);
    const battleCoordinator = createBattleCoordinator(
        game,
        stateMachine,
        player,
        battleMap,
        turnManager,
        ui,
        hudCoordinator,
        battlePlayerActionController,
        battleCommandController,
        battleTurnController,
    );
    return { battleCommandController, battleCoordinator };
};

const createWorldMode = (game: GameFacade, runtimeBase: RuntimeBase, shared: SharedRuntime, loreBookController: LoreBookController) => {
    const { player, worldMap, encounterSystem, ui } = runtimeBase;
    return createWorldModeControllerRuntime(game, player, worldMap, encounterSystem, shared.stateMachine, ui, shared.hudCoordinator, loreBookController);
};

// eslint-disable-next-line style-guide/function-length-warning
function createRuntimeControllers(game: GameFacade, runtimeBase: RuntimeBase, startupState: GameStartupState) {
    const { player, worldMap, battleMap, turnManager, ui } = runtimeBase;
    const packService = new QuestPackService({ locationNamesProvider: () => worldMap.getAllVillageNames() });
    const questCharacterNameReservoir = new QuestCharacterNameReservoir(packService);
    const questGenerator = createQuestGenerator(worldMap, packService);
    const questUiController = createQuestUiController(game, ui);
    const loreBookController = new LoreBookController({ loreBody: ui.hudElements.loreBody }, player, worldMap);
    const magicSystem = new MagicSystem(player);
    if (startupState.mode === 'restore') {
        magicSystem.restoreSpellLevels(startupState.save.spellLevels);
    }
    const battleUiController = new BattleUiController(ui.battleUI, battleMap, turnManager, player, ui.gameLogUI.log, magicSystem);
    const shared = createSharedRuntime(
        game,
        runtimeBase,
        loreBookController,
        magicSystem,
        battleUiController,
        () => questCharacterNameReservoir.nextName(),
    );
    const combat = createBattleControllers(game, runtimeBase, shared, magicSystem, battleUiController);
    shared.battleCommandControllerRef = combat.battleCommandController;
    const worldModeController = createWorldMode(game, runtimeBase, shared, loreBookController);
    return { questGenerator, questUiController, magicSystem, worldModeController, ...shared, ...combat };
}

const bindRuntimeUi = (
    game: GameFacade,
    canvas: HTMLCanvasElement,
    ui: RuntimeUi,
    runtime: RuntimeControllers,
    devController: DeveloperEventController,
) => new GameRuntimeUiBinder(
    game,
    canvas,
    ui,
    runtime.villageActionsController,
    devController,
    runtime.villageCoordinator,
    runtime.battleCoordinator,
    runtime.worldModeController,
    runtime.hudCoordinator,
).bind();

// eslint-disable-next-line style-guide/function-length-warning
const assignRuntime = (game: GameFacade, runtimeBase: RuntimeBase, runtime: RuntimeControllers, devController: DeveloperEventController): void => {
    const { player, worldMap, battleMap, ui } = runtimeBase;
    const renderRouter = new GameRenderRouter(
        createRenderRouter(game, worldMap, player, battleMap, runtimeBase.turnManager, runtimeBase.villageLifeRenderer),
    );
    game.assignRuntime({
        player,
        worldMap,
        battleMap,
        magicSystem: runtime.magicSystem,
        ui,
        questGenerator: runtime.questGenerator,
        questUiController: runtime.questUiController,
        stateMachine: runtime.stateMachine,
        renderRouter,
        villageCoordinator: runtime.villageCoordinator,
        villageActionsController: runtime.villageActionsController,
        worldModeController: runtime.worldModeController,
        hudCoordinator: runtime.hudCoordinator,
        battleCoordinator: runtime.battleCoordinator,
        devController,
    });
};

// eslint-disable-next-line style-guide/function-length-warning
export function buildGameRuntime(
    game: GameFacade,
    canvas: HTMLCanvasElement,
    startupState: GameStartupState,
    worldColumns: number,
    worldRows: number,
    worldCellSize: number,
): void {
    const runtimeBase = createRuntimeBase(startupState, worldColumns, worldRows, worldCellSize);
    const runtime = createRuntimeControllers(game, runtimeBase, startupState);
    const devController = createDevController(
        runtimeBase.ui,
        runtimeBase.encounterSystem,
        runtimeBase.worldMap,
        game.worldInteractionRuntime,
        () => game.getWorldSimulationState(),
        () => game.getPersistenceOverview(),
        runtime.villageActionsController,
        runtime.villageCoordinator,
    );
    devController.applyDeveloperModeOnStartup();
    bindRuntimeUi(game, canvas, runtimeBase.ui, runtime, devController);
    assignRuntime(game, runtimeBase, runtime, devController);
}
