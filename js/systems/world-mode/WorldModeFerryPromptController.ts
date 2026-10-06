import WorldMap from '../world/worldMap/WorldMap.js';
import { WorldModeCallbacks } from './WorldModeTypes.js';

export type FerryRouteOption = {
    destinationName: string;
    destination: { col: number; row: number };
    waterCells: number;
    priceGold: number;
};

export default class WorldModeFerryPromptController {
    private worldMap: WorldMap;
    private callbacks: WorldModeCallbacks;
    private isFerryPromptOpen = false;
    private selectedRouteIndex = 0;

    constructor(worldMap: WorldMap, callbacks: WorldModeCallbacks) {
        this.worldMap = worldMap;
        this.callbacks = callbacks;
    }

    public tryOpenFerryPromptAtCurrentPosition(): boolean {
        const options = this.getRouteOptions();
        if (options.length === 0) {
            this.closeFerryPrompt();
            return false;
        }

        this.selectedRouteIndex = Math.max(0, Math.min(this.selectedRouteIndex, options.length - 1));
        this.openFerryPrompt(options);
        return true;
    }

    public confirmFerryTravelAtCurrentSelection(playerGold: number): { traveled: boolean; reason?: 'not_on_dock' | 'cannot_afford' } {
        const options = this.getRouteOptions();
        if (options.length === 0) {
            this.closeFerryPrompt();
            return { traveled: false, reason: 'not_on_dock' };
        }

        const option = options[this.getValidSelectedIndex(options)];
        if (playerGold < option.priceGold) {
            this.openFerryPrompt(options);
            return { traveled: false, reason: 'cannot_afford' };
        }

        this.worldMap.travelByFerryAtPlayerPosition(this.selectedRouteIndex);
        this.closeFerryPrompt();
        return { traveled: true };
    }

    public dismissFerryPrompt(): void {
        this.closeFerryPrompt();
    }

    public setSelectedRouteIndex(rawIndex: number): void {
        this.selectedRouteIndex = Number.isFinite(rawIndex) ? Math.max(0, Math.floor(rawIndex)) : 0;
        if (!this.isFerryPromptOpen) {
            return;
        }

        this.syncFerryPromptWithPlayerPosition();
    }

    public syncFerryPromptWithPlayerPosition(): void {
        if (!this.isFerryPromptOpen) {
            return;
        }

        const options = this.getRouteOptions();
        if (options.length === 0) {
            this.closeFerryPrompt();
            return;
        }

        this.openFerryPrompt(options);
    }

    public isPromptOpen = (): boolean => this.isFerryPromptOpen;

    public getSelectedOption(): FerryRouteOption | null {
        const options = this.getRouteOptions();
        if (options.length === 0) {
            return null;
        }

        return options[this.getValidSelectedIndex(options)] ?? null;
    }

    private openFerryPrompt(options: FerryRouteOption[]): void {
        this.isFerryPromptOpen = true;
        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.callbacks.onRequestFerryPrompt(options, this.getValidSelectedIndex(options), { x, y });
    }

    private closeFerryPrompt(): void {
        if (!this.isFerryPromptOpen) {
            return;
        }

        this.isFerryPromptOpen = false;
        this.callbacks.onCloseFerryPrompt();
    }

    private getRouteOptions(): FerryRouteOption[] {
        const routes = this.worldMap.getFerryRoutesAtPlayerPosition();
        return routes.map((route) => ({
            destinationName: this.worldMap.getSettlementNameAt(route.to.col, route.to.row),
            destination: route.to,
            waterCells: route.waterCells,
            priceGold: this.computeFerryPrice(route.waterCells),
        }));
    }

    private getValidSelectedIndex = (options: FerryRouteOption[]): number => Math.max(0, Math.min(this.selectedRouteIndex, options.length - 1));

    private computeFerryPrice = (waterCells: number): number => Math.max(1, Math.round(waterCells * 2));
}
