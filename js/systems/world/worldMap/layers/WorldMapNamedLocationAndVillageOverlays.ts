// @ts-nocheck
import WorldMapVillageNavigationAndRender from '../WorldMapVillageNavigationAndRender.js';
import { FOG_STATE } from '../WorldMapCore.js';
import { getLocationFeatureDefinitions } from '../locationFeatures/LocationFeatureRegistry.js';
export default class WorldMapNamedLocationAndVillageOverlays extends WorldMapVillageNavigationAndRender {
    public registerNamedLocation(name: string): void {
        if (this.namedLocations.has(name)) {
            return;
        }

        const villagePosition = this.findVillagePositionByName(name);
        const position = villagePosition ?? this.findNamedLocationPosition();
        if (position) {
            const terrain = this.getTerrain(position.col, position.row);
            this.namedLocations.set(name, { name, position, terrainType: terrain?.type ?? 'grass' });
        }
    }

    public revealNamedLocation(name: string): boolean {
        const location = this.namedLocations.get(name);
        if (!location || !this.isDiscovered(location.position.col, location.position.row)) {
            return false;
        }

        this.focusedLocationName = name;
        this.centerViewportOnCell(location.position.col, location.position.row);
        return true;
    }

    public clearFocusedLocation = (): void => {
        this.focusedLocationName = null;
    };

    public getKnownSettlementNames = (): string[] => {
        const knownVillages = this.getKnownVillages().map((village) => village.name);
        const namedLocations = Array.from(this.namedLocations.values())
            .filter((location) => this.isDiscovered(location.position.col, location.position.row))
            .map((location) => location.name);
        return Array.from(new Set([...knownVillages, ...namedLocations]))
            .sort((left, right) => left.localeCompare(right));
    };

    public getCurrentNamedLocation(): string | null {
        const currentKey = this.getCellKey(this.playerGridPos.col, this.playerGridPos.row);
        for (const location of this.namedLocations.values()) {
            if (this.getCellKey(location.position.col, location.position.row) === currentKey) {
                return location.name;
            }
        }

        return null;
    }

    private drawLocationFeatures(ctx: CanvasRenderingContext2D, bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): void {
        getLocationFeatureDefinitions().forEach((featureDefinition) => {
            this.getLocationFeatureCells(featureDefinition.id).forEach((index) => {
                const col = index % this.grid.columns;
                const row = Math.floor(index / this.grid.columns);
                if (col < bounds.startCol || col > bounds.endCol || row < bounds.startRow || row > bounds.endRow) {return;}
                if (this.getFogState(col, row) === FOG_STATE.UNKNOWN) {return;}
                const cell = this.grid.getCellAt(col, row);
                if (!cell) {return;}
                featureDefinition.render(
                    ctx,
                    this.renderer,
                    { x: cell.x + (cell.width / 2), y: cell.y + (cell.height / 2) },
                );
                this.approxDrawCallsThisFrame += 1;
            });
        });
    }

    private drawVillageRoads(ctx: CanvasRenderingContext2D, bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): void {
        this.villageRoadLinks.forEach((link) => {
            if (!this.isRoadLinkWithinBounds(link, bounds)) {
                return;
            }
            const visibleSegments = this.buildVisibleRoadSegments(link);
            visibleSegments.forEach((segment) => {
                if (segment.style === 'waterCrossing') {
                    this.renderer.drawWaterCrossingRoadPath(ctx, segment.points, segment.alpha);
                    this.approxDrawCallsThisFrame += 1;
                    return;
                }
                this.renderer.drawVillageRoadPath(ctx, segment.points, segment.alpha);
                this.approxDrawCallsThisFrame += 1;
            });
        });
    }

}
