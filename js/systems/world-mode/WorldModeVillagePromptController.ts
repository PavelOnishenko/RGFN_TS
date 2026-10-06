import WorldMap from '../world/worldMap/WorldMap.js';
import { WorldModeCallbacks } from './WorldModeTypes.js';

export default class WorldModeVillagePromptController {
    private worldMap: WorldMap;
    private callbacks: WorldModeCallbacks;
    private isVillagePromptOpen = false;

    constructor(worldMap: WorldMap, callbacks: WorldModeCallbacks) {
        this.worldMap = worldMap;
        this.callbacks = callbacks;
    }

    public tryEnterVillageAtCurrentPosition(): boolean {
        if (!this.worldMap.isPlayerOnVillage()) {
            return false;
        }

        this.openVillageEntryPrompt();
        return true;
    }

    public confirmVillageEntryFromPrompt(): boolean {
        if (!this.worldMap.isPlayerOnVillage()) {
            this.closeVillageEntryPrompt();
            return false;
        }

        this.closeVillageEntryPrompt();
        this.callbacks.onEnterVillage();
        return true;
    }

    public dismissVillageEntryPrompt(): void {
        this.closeVillageEntryPrompt();
    }

    public closeVillageEntryPrompt(): void {
        if (!this.isVillagePromptOpen) {
            return;
        }

        this.isVillagePromptOpen = false;
        this.callbacks.onCloseVillageEntryPrompt();
    }

    public syncVillagePromptWithPlayerPosition(): void {
        if (!this.isVillagePromptOpen) {
            return;
        }

        if (!this.worldMap.isPlayerOnVillage()) {
            this.closeVillageEntryPrompt();
            return;
        }

        const villageName = this.worldMap.getVillageNameAtPlayerPosition();
        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.callbacks.onRequestVillageEntryPrompt(villageName, { x, y });
    }

    public openVillageEntryPrompt(): void {
        const villageName = this.worldMap.getVillageNameAtPlayerPosition();
        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.isVillagePromptOpen = true;
        this.callbacks.onRequestVillageEntryPrompt(villageName, { x, y });
    }

    public isPromptOpen = (): boolean => this.isVillagePromptOpen;
}
