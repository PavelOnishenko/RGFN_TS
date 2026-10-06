/* eslint-disable style-guide/file-length-warning, style-guide/function-length-warning, style-guide/rule17-comma-layout */
import GameLoop from '../core/GameLoop.js';
import Renderer from '../core/Renderer.js';
import InputManager from '../systems/InputManager.js';
import GameInputSetup from '../systems/game/GameInputSetup.js';
import { applyThemeToCSS, theme } from '../config/ThemeConfig.js';
import { balanceConfig } from '../config/balance/balanceConfig.js';
import StateMachine from '../utils/StateMachine.js';
import { BattleUI, DeveloperUI, GameLogUI, HudElements, VillageUI, WorldUI } from '../systems/game/ui/GameUiTypes.js';
import GameRenderRouter from '../systems/game/runtime/GameRenderRouter.js';
import GameVillageCoordinator from '../systems/game/runtime/GameVillageCoordinator.js';
import GameHudCoordinator from '../systems/game/runtime/GameHudCoordinator.js';
import GameBattleCoordinator from '../systems/game/runtime/GameBattleCoordinator.js';
import WorldModeController from '../systems/world/worldMap/WorldModeController.js';
import VillageActionsController from '../systems/village/VillageActionsController.js';
import WorldMap from '../systems/world/worldMap/WorldMap.js';
import BattleMap from '../systems/combat/BattleMap.js';
import Player from '../entities/player/Player.js';
import MagicSystem from '../systems/controllers/magic/MagicSystem.js';
import DeveloperEventController from '../systems/encounter/DeveloperEventController.js';
import QuestGenerator from '../systems/quest/QuestGenerator.js';
import QuestUiController from '../systems/quest/ui/QuestUiController.js';
import GameQuestRuntime from './runtime/GameQuestRuntime.js';
import GamePersistenceRuntime, { GameStartupState } from './runtime/GamePersistenceRuntime.js';
import GameWorldInteractionRuntime from './runtime/GameWorldInteractionRuntime.js';
import GameFacadeLifecycleCoordinator from './runtime/GameFacadeLifecycleCoordinator.js';
import GameFacadeWorldInteractionCoordinator from './runtime/GameFacadeWorldInteractionCoordinator.js';
import { createGameRuntime } from './GameFactory.js';
import type { GameFacadeStateAccess } from './runtime/GameFacadeSharedTypes.js';
import { FerryRouteOption } from '../systems/world-mode/WorldModeFerryPromptController.js';
import GameTimeRuntime from '../systems/time/GameTimeRuntime.js';
import { QuestNode, QuestRewardMetadata } from '../systems/quest/QuestTypes.js';
import { resolveSideQuestRewardMetadata } from '../systems/quest/QuestRewardResolver.js';
import WorldSimulationRuntime, { WorldSimulationState } from '../systems/world-sim/WorldSimulationRuntime.js';

export type UIBundle = {
    hudElements: HudElements;
    worldUI: WorldUI;
    battleUI: BattleUI;
    villageUI: VillageUI;
    gameLogUI: GameLogUI;
    developerUI: DeveloperUI;
};

export type GameRuntimeAssignment = {
    player: Player;
    worldMap: WorldMap;
    battleMap: BattleMap;
    magicSystem: MagicSystem;
    ui: UIBundle;
    questGenerator: QuestGenerator;
    questUiController: QuestUiController;
    stateMachine: StateMachine;
    renderRouter: GameRenderRouter;
    villageCoordinator: GameVillageCoordinator;
    villageActionsController: VillageActionsController;
    worldModeController: WorldModeController;
    hudCoordinator: GameHudCoordinator;
    battleCoordinator: GameBattleCoordinator;
    devController: DeveloperEventController;
};

const SAVE_KEY = 'rgfn_game_save_v2';
const LEGACY_SAVE_KEYS = ['rgfn_game_save_v1'];
const WORLD_MAP_COLUMNS = balanceConfig.worldMap.dimensions.columns ?? theme.worldMap.gridDimensions.columns;
const WORLD_MAP_ROWS = balanceConfig.worldMap.dimensions.rows ?? theme.worldMap.gridDimensions.rows;
const WORLD_MAP_CELL_SIZE = theme.worldMap.cellSize.default;

export class GameFacade implements GameFacadeStateAccess {
    public readonly canvas: HTMLCanvasElement;
    public readonly saveKey = SAVE_KEY;
    public readonly renderer: Renderer;
    public readonly input: InputManager;
    public readonly loop: GameLoop;
    public stateMachine!: StateMachine;
    public renderRouter!: GameRenderRouter;
    public villageCoordinator!: GameVillageCoordinator;
    public hudCoordinator!: GameHudCoordinator;
    public battleCoordinator!: GameBattleCoordinator;
    public worldModeController!: WorldModeController;
    public villageActionsController!: VillageActionsController;
    public worldMap!: WorldMap;
    public battleMap!: BattleMap;
    public player!: Player;
    public magicSystem!: MagicSystem;
    public readonly questRuntime = new GameQuestRuntime();
    public readonly persistenceRuntime = new GamePersistenceRuntime(SAVE_KEY, LEGACY_SAVE_KEYS);
    public readonly startupState: GameStartupState;
    public readonly worldInteractionRuntime = new GameWorldInteractionRuntime();
    public readonly worldSimulationRuntime = new WorldSimulationRuntime();
    public gameTime!: GameTimeRuntime;
    private readonly lifecycle = new GameFacadeLifecycleCoordinator(this);
    private readonly worldInteractionCoordinator = new GameFacadeWorldInteractionCoordinator(this);
    private questGenerator: QuestGenerator | null = null;
    private devController: DeveloperEventController | null = null;

    public constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.input = new InputManager({ enableRepeatPress: true });
        this.loop = new GameLoop((dt: number) => this.update(dt), () => this.render());
        const startupSave = this.persistenceRuntime.loadValidatedSaveSnapshot();
        this.startupState = startupSave ? { mode: 'restore', save: startupSave } : { mode: 'new' };
        createGameRuntime(this, canvas, this.startupState, WORLD_MAP_COLUMNS, WORLD_MAP_ROWS, WORLD_MAP_CELL_SIZE);
        new GameInputSetup(this.input, { onToggleDeveloperModal: () => this.devController?.toggleModal() }).configure();
        window.addEventListener('resize', this.lifecycle.handleResize);
        this.lifecycle.handleResize();
        applyThemeToCSS();
    }

    public assignRuntime(runtime: GameRuntimeAssignment): void {
        this.player = runtime.player;
        this.worldMap = runtime.worldMap;
        this.battleMap = runtime.battleMap;
        this.magicSystem = runtime.magicSystem;
        this.stateMachine = runtime.stateMachine;
        this.renderRouter = runtime.renderRouter;
        this.villageCoordinator = runtime.villageCoordinator;
        this.villageActionsController = runtime.villageActionsController;
        this.worldModeController = runtime.worldModeController;
        this.hudCoordinator = runtime.hudCoordinator;
        this.battleCoordinator = runtime.battleCoordinator;
        this.devController = runtime.devController;
        const startupSave = this.startupState.mode === 'restore' ? this.startupState.save : null;
        const savedTime = startupSave?.time ?? null;
        const savedSideQuests = startupSave?.sideQuests ?? [];
        const worldSeed = Number(this.worldMap.getState().worldSeed ?? 0);
        const characterSeed = this.hashStringSeed(this.player.name);
        this.gameTime = new GameTimeRuntime(savedTime, worldSeed ^ characterSeed);
        this.worldMap.setDaylightFactor(this.gameTime.getDaylightFactor());
        this.worldSimulationRuntime.initialize(startupSave?.worldSimulation);
        if (this.worldSimulationRuntime.wasRestoredWithNpcs()) {
            this.villageActionsController.restoreWorldNpcRoster(this.worldSimulationRuntime.getNpcStates());
        }
        this.questRuntime.initialize(
            runtime.questGenerator,
            runtime.questUiController,
            () => startupSave?.quest ?? null,
            ({ barterContracts, escortContracts, defendContracts }) => {
                this.villageActionsController.configureQuestBarterContracts(barterContracts);
                this.villageActionsController.configureQuestEscortContracts(escortContracts);
                this.villageActionsController.configureQuestDefendContracts(defendContracts);
            },
            this.worldMap,
        );
        this.questGenerator = runtime.questGenerator;
        this.questRuntime.activeSideQuests = Array.isArray(savedSideQuests)
            ? savedSideQuests.map((quest) => ({ ...quest, track: 'side' as const }))
            : [];
        this.lifecycle.initializeAfterRuntimeAssignment();
    }

    public start(): void { this.lifecycle.start(); }
    public update(deltaTime: number): void { this.lifecycle.update(deltaTime); }
    public render(): void { this.lifecycle.render(); }
    public gameOver(): void { this.lifecycle.gameOver(); }
    public startNewCharacter(): void { this.lifecycle.startNewCharacter(); }
    public onGodSkillsBoost(): void { this.lifecycle.onGodSkillsBoost(); }
    public onQuestLocationClick = (locationName: string): boolean => this.lifecycle.onQuestLocationClick(locationName);
    public onVillageBarterCompleted(trader: string, item: string, village: string): void { this.lifecycle.onVillageBarterCompleted(trader, item, village); }
    public onMonsterKilled(monsterName: string): void { this.lifecycle.onMonsterKilled(monsterName); }
    public onTryRecruitEscort = (personName: string, villageName: string): 'joined' | 'inactive' | 'already-joined' | 'not-available' =>
        this.lifecycle.onTryRecruitEscort(personName, villageName);
    public onRevealRecoverHolder = (villageName: string, npcName: string): { revealed: boolean; personName?: string; itemName?: string } =>
        this.lifecycle.onRevealRecoverHolder(villageName, npcName);
    public onTryStartRecoverConfrontation = (
        personName: string,
        villageName: string,
    ): { status: 'started' | 'inactive' | 'not-target' | 'not-ready'; enemies?: import('../entities/Skeleton.js').default[]; itemName?: string } =>
        this.lifecycle.onTryStartRecoverConfrontation(personName, villageName);
    public onBattleEnded = (result: 'victory' | 'defeat' | 'fled'): void => this.lifecycle.onBattleEnded(result);
    public onVillageAdvanceTime(minutes: number, fatigueScale: number): void {
        this.lifecycle.onVillageAdvanceTime(minutes, fatigueScale);
    }
    public onVillageLeave(): void {
        this.lifecycle.onVillageLeave();
    }
    public onTryStartDefendObjective = (
        npcName: string,
        villageName: string,
        villagerNames: string[],
    ): { status: 'started' | 'inactive' | 'not-target' | 'already-active'; objectiveTitle?: string; days?: number } =>
        this.lifecycle.onTryStartDefendObjective(npcName, villageName, villagerNames);
    public initializeVillageSideQuestOffers = (
        villageName: string,
        npcQuestOfferRolls: Array<{ npcName: string; questCount: number }>,
    ): void => {
        if (!this.questGenerator) {
            return;
        }
        this.questRuntime.clearVillageSideQuestOffers(villageName);
        void this.generateVillageSideQuestOffers(villageName, npcQuestOfferRolls);
    };
    public registerVillageSideQuestOffer = (quest: QuestNode): boolean => this.questRuntime.registerVillageSideQuestOffer(quest);
    public markSideQuestReadyToTurnIn = (questId: string): boolean => this.questRuntime.markSideQuestReadyToTurnIn(questId);
    public getVillageSideQuestOffers = (villageName: string, npcName: string): QuestNode[] =>
        this.questRuntime.getVillageSideQuestOffers(villageName, npcName);
    public getVillageNpcActiveSideQuests = (villageName: string, npcName: string): QuestNode[] =>
        this.questRuntime.getVillageNpcActiveSideQuests(villageName, npcName);
    public getActiveSideQuests = (): QuestNode[] => this.questRuntime.getActiveSideQuests();
    public regenerateSideQuest = async (questId: string): Promise<boolean> => {
        if (!this.questGenerator) {
            return false;
        }
        const currentQuest = this.questRuntime.getKnownSideQuest(questId);
        if (!currentQuest) {
            return false;
        }
        const giverNpcName = currentQuest.giverNpcName?.trim();
        const giverVillageName = currentQuest.giverVillageName?.trim();
        if (!giverNpcName || !giverVillageName) {
            return false;
        }

        const regeneratedQuestId = this.createSideQuestId(giverVillageName, giverNpcName);
        const regeneratedQuest = await this.questGenerator.generateSideQuest(regeneratedQuestId, giverNpcName, giverVillageName);
        regeneratedQuest.track = 'side';
        regeneratedQuest.status = currentQuest.status === 'available' ? 'available' : 'active';
        regeneratedQuest.isCompleted = false;
        const replaced = this.questRuntime.replaceKnownSideQuest(questId, regeneratedQuest);
        if (replaced) {
            this.villageActionsController?.refreshSelectedNpcSideQuestUi();
        }
        return replaced;
    };
    public acceptSideQuest = (questId: string): { accepted: boolean; reason?: 'inactive' | 'not-found' | 'already-active' } =>
        this.questRuntime.acceptSideQuest(questId);
    public turnInSideQuest = (
        questId: string,
        npcName: string,
        villageName: string,
    ): {
        turnedIn: boolean;
        reason?: 'inactive' | 'not-found' | 'wrong-giver' | 'not-ready' | 'already-completed';
        reward?: string;
        rewardMetadata?: QuestRewardMetadata;
    } => {
        const result = this.questRuntime.turnInSideQuest(questId, npcName, villageName);
        const rewardMetadata = resolveSideQuestRewardMetadata(result.rewardMetadata, result.reward);
        if (!result.turnedIn || !rewardMetadata) {
            return result;
        }
        this.player.gold += Math.max(0, Math.floor(rewardMetadata.gold));
        this.player.addXp(Math.max(0, Math.floor(rewardMetadata.xp)));
        return result;
    };

    public tryCreateQuestMonsterEncounter = (): {
        enemies: import('../entities/Skeleton.js').default[];
        hint?: string;
    } | null => this.questRuntime.tryCreateQuestMonsterEncounter(this.worldMap);

    public onVillageEntered(_worldMap: WorldMap, _villageCoordinator: GameVillageCoordinator): void { this.lifecycle.onVillageEntered(); }
    public showVillageEntryPrompt(worldUI: WorldUI, villageName: string, anchor: { x: number; y: number }): void {
        this.worldInteractionCoordinator.showVillageEntryPrompt(worldUI, villageName, anchor);
    }
    public hideVillageEntryPrompt(worldUI: WorldUI): void { this.worldInteractionCoordinator.hideVillageEntryPrompt(worldUI); }
    public showFerryPrompt(worldUI: WorldUI, options: FerryRouteOption[], selectedRouteIndex: number, anchor: { x: number; y: number }): void {
        this.worldInteractionCoordinator.showFerryPrompt(worldUI, options, selectedRouteIndex, anchor);
    }
    public hideFerryPrompt(worldUI: WorldUI): void { this.worldInteractionCoordinator.hideFerryPrompt(worldUI); }
    public handleCanvasMove(event: MouseEvent): void { this.worldInteractionCoordinator.handleCanvasMove(event); }
    public handleCanvasLeave(): void { this.worldInteractionCoordinator.handleCanvasLeave(); }
    public handleWorldMapWheel(event: WheelEvent): void { this.worldInteractionCoordinator.handleWorldMapWheel(event); }
    public handleWorldMapMiddleDragStart(event: MouseEvent): void { this.worldInteractionCoordinator.handleWorldMapMiddleDragStart(event); }
    public handleWorldMapKeyboardZoom(direction: 'in' | 'out'): void { this.worldInteractionCoordinator.handleWorldMapKeyboardZoom(direction); }
    public centerWorldMapOnPlayer(): void { this.worldInteractionCoordinator.centerWorldMapOnPlayer(); }
    public tryEnterVillageFromWorldMap(): void { this.worldInteractionCoordinator.tryEnterVillageFromWorldMap(); }
    public confirmWorldVillageEntry(): void { this.worldInteractionCoordinator.confirmWorldVillageEntry(); }

    public advanceTime(minutes: number, fatigueScale: number): void {
        if (!this.gameTime || !this.player || !this.worldMap) {
            return;
        }
        this.gameTime.advanceMinutes(minutes);
        this.player.addTravelFatigue(Math.max(0, fatigueScale));
        this.worldMap.setDaylightFactor(this.gameTime.getDaylightFactor());
        this.worldSimulationRuntime.tick(minutes, this.gameTime.getTotalMinutes());
        this.villageActionsController?.refreshNpcAvailability();
    }

    public readonly getWorldSimulationState = (): WorldSimulationState => this.worldSimulationRuntime.getState();
    public readonly getPersistenceOverview = (): ReturnType<GamePersistenceRuntime['getOverview']> => this.persistenceRuntime.getOverview();

    public getHudTimeSnapshot(): { clock: string; date: string; calendarTitle: string; calendarLines: string[] } {
        if (!this.gameTime) {
            return {
                clock: '--:--',
                date: 'Calendar uninitialized',
                calendarTitle: 'Calendar is unavailable',
                calendarLines: [],
            };
        }
        const snapshot = this.gameTime.getCalendarSnapshot();
        const calendarLines = snapshot.months.map((month, index) => {
            const prefix = index === snapshot.currentMonthIndex ? '→' : ' ';
            return `${prefix} ${String(index + 1).padStart(2, '0')}. ${month.name} — ${month.days} days`;
        });

        return {
            clock: this.gameTime.getHudClockText(),
            date: this.gameTime.getHudDateText(),
            calendarTitle: `Calendar: ${snapshot.months.length} months/year • ${snapshot.daysPerYear} days/year • Epoch Y${snapshot.startYear}`,
            calendarLines,
        };
    }

    public isNightTime(): boolean {
        if (!this.gameTime) {
            return false;
        }
        return this.gameTime.getDaylightFactor() < 0.7;
    }

    private hashStringSeed(text: string): number {
        let hash = 2166136261;
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    private createSideQuestId(villageName: string, npcName: string): string {
        const normalizedVillage = villageName.trim().toLocaleLowerCase();
        const normalizedNpc = npcName.trim().toLocaleLowerCase().replace(/\s+/g, '_');
        return `side.${normalizedVillage}.${normalizedNpc}.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
    }

    private async generateVillageSideQuestOffers(
        villageName: string,
        npcQuestOfferRolls: Array<{ npcName: string; questCount: number }>,
    ): Promise<void> {
        if (!this.questGenerator) {
            return;
        }
        const timestamp = Date.now();
        let sequence = 0;
        for (const roll of npcQuestOfferRolls) {
            const npcName = roll.npcName.trim();
            const questCount = Math.max(0, Math.floor(roll.questCount));
            if (!npcName || questCount <= 0) {
                continue;
            }
            for (let index = 0; index < questCount; index += 1) {
                sequence += 1;
                const sideQuestId = `side.${villageName.trim().toLocaleLowerCase()}.${npcName.toLocaleLowerCase().replace(/\s+/g, '_')}.${timestamp}.${sequence}`;
                const quest = await this.questGenerator.generateSideQuest(sideQuestId, npcName, villageName);
                this.registerVillageSideQuestOffer(quest);
            }
        }
    }
}

export default GameFacade;
