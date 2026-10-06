/* eslint-disable style-guide/function-length-warning */
import InputManager from '../../InputManager.js';
import WorldMap from './WorldMap.js';
import EncounterSystem from '../../encounter/EncounterSystem.js';
import Player from '../../../entities/player/Player.js';
import Skeleton from '../../../entities/Skeleton.js';
import Wanderer from '../../../entities/Wanderer.js';
import { ItemDiscoverySplash } from '../../../ui/ItemDiscoverySplash.js';
import { TerrainType } from '../../../types/game.js';
import WorldModeMovementInput from '../../world-mode/WorldModeMovementInput.js';
import WorldModeFerryPromptController from '../../world-mode/WorldModeFerryPromptController.js';
import WorldModeVillagePromptController from '../../world-mode/WorldModeVillagePromptController.js';
import WorldModeTravelEncounterController from '../../world-mode/WorldModeTravelEncounterController.js';

type WorldModeCallbacks = {
    onEnterVillage: () => void;
    onRequestVillageEntryPrompt: (villageName: string, anchor: { x: number; y: number }) => void;
    onCloseVillageEntryPrompt: () => void;
    onRequestFerryPrompt: (options: import('../../world-mode/WorldModeFerryPromptController.js').FerryRouteOption[], selectedRouteIndex: number, anchor: { x: number; y: number }) => void;
    onCloseFerryPrompt: () => void;
    onStartBattle: (enemies: Skeleton[], terrainType: TerrainType) => void;
    onAddBattleLog: (message: string, type?: string) => void;
    onUpdateHUD: () => void;
    onAdvanceTime: (minutes: number, fatigueScale: number) => void;
    isNightTime: () => boolean;
    onRememberTraveler: (traveler: Wanderer, disposition: 'hostile' | 'peaceful') => void;
    getQuestBattleEncounter: () => { enemies: Skeleton[]; hint?: string } | null;
};

export default class WorldModeController {
    private player: Player;
    private worldMap: WorldMap;
    private callbacks: WorldModeCallbacks;
    private movementInput: WorldModeMovementInput;
    private villagePromptController: WorldModeVillagePromptController;
    private ferryPromptController: WorldModeFerryPromptController;
    private travelEncounterController: WorldModeTravelEncounterController;

    constructor(
        input: InputManager,
        player: Player,
        worldMap: WorldMap,
        encounterSystem: EncounterSystem,
        itemDiscoverySplash: ItemDiscoverySplash,
        callbacks: WorldModeCallbacks,
    ) {
        this.player = player;
        this.callbacks = callbacks;
        this.worldMap = worldMap;
        this.movementInput = new WorldModeMovementInput(input, worldMap);
        this.villagePromptController = new WorldModeVillagePromptController(worldMap, callbacks);
        this.ferryPromptController = new WorldModeFerryPromptController(worldMap, callbacks);
        this.travelEncounterController = new WorldModeTravelEncounterController(
            player,
            worldMap,
            encounterSystem,
            itemDiscoverySplash,
            callbacks,
            this.villagePromptController,
            this.ferryPromptController,
        );
    }

    public enterWorldMode(
        hudModeIndicator: HTMLElement,
        worldSidebar: HTMLElement,
        battleSidebar: HTMLElement,
        villageSidebar: HTMLElement,
        villageActionsPanel: HTMLElement,
        villageRumorsPanel: HTMLElement,
    ): void {
        this.villagePromptController.closeVillageEntryPrompt();
        this.ferryPromptController.dismissFerryPrompt();
        hudModeIndicator.textContent = 'World Map';
        worldSidebar.classList.add('hidden');
        battleSidebar.classList.add('hidden');
        villageSidebar.classList.add('hidden');
        villageActionsPanel.classList.add('hidden');
        villageRumorsPanel.classList.add('hidden');

        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
        this.callbacks.onUpdateHUD();
    }

    public updateWorldMode(): void {
        this.movementInput.handleMapViewportInput();
        this.villagePromptController.syncVillagePromptWithPlayerPosition();
        this.ferryPromptController.syncFerryPromptWithPlayerPosition();

        if (this.movementInput.isActionPressed('enterVillage') && this.tryEnterVillageAtCurrentPosition()) {
            return;
        }

        const direction = this.movementInput.getPendingMoveDirection();
        if (direction) {
            const moveResult = this.worldMap.movePlayer(direction);
            if (moveResult.moved) {
                this.travelEncounterController.onPlayerMoved(moveResult.isPreviouslyDiscovered);
            }
        }

        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
    }

    public readonly tryEnterVillageAtCurrentPosition = (): boolean => this.villagePromptController.tryEnterVillageAtCurrentPosition();

    public readonly confirmVillageEntryFromPrompt = (): boolean => this.villagePromptController.confirmVillageEntryFromPrompt();

    public dismissVillageEntryPrompt(): void {
        this.villagePromptController.dismissVillageEntryPrompt();
    }

    public handleCampSleep(): void {
        this.travelEncounterController.handleCampSleep();
    }

    public confirmFerryTravelFromPrompt(): void {
        this.travelEncounterController.confirmFerryTravel();
    }

    public dismissFerryPrompt(): void {
        this.ferryPromptController.dismissFerryPrompt();
    }

    public setFerryPromptRouteIndex(index: number): void {
        this.ferryPromptController.setSelectedRouteIndex(index);
    }
}
