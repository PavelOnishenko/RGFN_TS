// @ts-nocheck
/* eslint-disable style-guide/file-length-warning, style-guide/function-length-warning, style-guide/rule17-comma-layout */
import WorldMapRoadNetwork from './WorldMapRoadNetwork.js';
import { theme } from '../../../config/ThemeConfig.js';
import { FOG_STATE } from './WorldMapCore.js';
export default class WorldMapPersistenceAndSelection extends WorldMapRoadNetwork {
    public getNpcNavigationSnapshot(): { columns: number; rows: number; traversableCellKeys: string[] } {
        const traversableCellKeys: string[] = [];
        this.grid.forEachCell((_cell: GridCell, col: number, row: number) => {
            if (this.getTerrain(col, row)?.type !== 'water') {
                traversableCellKeys.push(this.getCellKey(col, row));
            }
        });
        return { columns: this.grid.columns, rows: this.grid.rows, traversableCellKeys };
    }

    public getState = (): Record<string, unknown> => ({
        worldSeed: this.worldSeed,
        playerGridPos: { ...this.playerGridPos },
        fogStates: Array.from(this.fogStates.entries()),
        villages: Array.from(this.villages.values()),
        locationFeatures: Array.from(this.locationFeatureIndexMap.entries()).map(([index, featureSet]) => ({
            index,
            featureIds: Array.from(featureSet.values()),
        })),
        visitedCells: Array.from(this.visitedCells.values()),
        viewport: { cellSize: this.grid.cellSize, offsetX: this.grid.offsetX, offsetY: this.grid.offsetY },
    });

    public restoreState(state: Record<string, unknown>): void {
        this.restoreWorldSeed(state.worldSeed);
        this.restorePlayerPosition(state.playerGridPos as { col?: unknown; row?: unknown } | undefined);
        this.restoreFogStateEntries(state.fogStates);
        this.restoreVillageEntries(state.villages);
        this.restoreLocationFeatures(state.locationFeatures);
        this.restoreVisitedCells(state.visitedCells);
        this.restoreViewport(state.viewport as { cellSize?: unknown; offsetX?: unknown; offsetY?: unknown } | undefined);
        this.refreshVisibility();
    }

    private restoreWorldSeed(worldSeed: unknown): void {
        if (typeof worldSeed !== 'number' || !Number.isFinite(worldSeed)) {return;}
        const nextWorldSeed = Math.floor(Math.abs(worldSeed));
        if (nextWorldSeed !== this.worldSeed) {
            this.worldSeed = nextWorldSeed;
            this.generateWorld();
        }
    }

    private restorePlayerPosition(playerGridPos?: { col?: unknown; row?: unknown }): void {
        if (!playerGridPos || typeof playerGridPos.col !== 'number' || typeof playerGridPos.row !== 'number') {return;}
        if (this.grid.isValidPosition(playerGridPos.col, playerGridPos.row)) {
            this.playerGridPos = { col: playerGridPos.col, row: playerGridPos.row };
        }
    }

    private restoreFogStateEntries(entries: unknown): void {
        if (!Array.isArray(entries)) {return;}
        this.fogStates = new Map(entries.filter((entry): entry is [string, FogState] => Array.isArray(entry)
            && entry.length === 2
            && typeof entry[0] === 'string'
            && (entry[1] === FOG_STATE.UNKNOWN || entry[1] === FOG_STATE.HIDDEN || entry[1] === FOG_STATE.DISCOVERED)));
        this.fogStatesByIndex = new Array(this.grid.columns * this.grid.rows).fill(FOG_STATE.UNKNOWN);
        this.fogStates.forEach((value, key) => {
            const [colText, rowText] = key.split(',');
            const col = Number(colText);
            const row = Number(rowText);
            if (this.grid.isValidPosition(col, row)) {this.fogStatesByIndex[this.getCellIndex(col, row)] = value;}
        });
    }

    private restoreVillageEntries(entries: unknown): void {
        if (!Array.isArray(entries)) {return;}
        this.villages = new Set(entries.filter((entry): entry is string => typeof entry === 'string'));
        this.villageIndexSet = new Set<number>();
        this.villages.forEach((key) => {
            const [colText, rowText] = key.split(',');
            const col = Number(colText);
            const row = Number(rowText);
            if (this.grid.isValidPosition(col, row)) {this.villageIndexSet.add(this.getCellIndex(col, row));}
        });
    }

    private restoreLocationFeatures(entries: unknown): void {
        this.clearAllLocationFeatures();
        this.villageIndexSet.forEach((index) => this.addLocationFeatureAt(index % this.grid.columns, Math.floor(index / this.grid.columns), 'village'));
        this.generateVillageRoadNetwork();
        if (!Array.isArray(entries)) {return;}
        entries.forEach((entry) => {
            if (!entry || typeof entry !== 'object') {return;}
            const index = Number((entry as { index?: unknown }).index);
            const featureIds = (entry as { featureIds?: unknown }).featureIds;
            if (!Number.isInteger(index) || index < 0 || index >= this.grid.columns * this.grid.rows || !Array.isArray(featureIds)) {return;}
            const col = index % this.grid.columns;
            const row = Math.floor(index / this.grid.columns);
            featureIds.filter((featureId): featureId is 'village' | 'ferry-dock' => featureId === 'village' || featureId === 'ferry-dock')
                .forEach((featureId) => this.addLocationFeatureAt(col, row, featureId));
        });
    }

    private restoreVisitedCells(visitedCells: unknown): void {
        if (Array.isArray(visitedCells)) {
            this.visitedCells = new Set(visitedCells.filter((entry): entry is string => typeof entry === 'string'));
            return;
        }
        this.visitedCells = new Set([this.getCellKey(this.playerGridPos.col, this.playerGridPos.row)]);
    }

    private restoreViewport(viewport?: { cellSize?: unknown; offsetX?: unknown; offsetY?: unknown }): void {
        if (viewport && typeof viewport.cellSize === 'number' && typeof viewport.offsetX === 'number' && typeof viewport.offsetY === 'number') {
            const clampedCellSize = Math.max(theme.worldMap.cellSize.min, Math.min(theme.worldMap.cellSize.max, viewport.cellSize));
            this.grid.updateLayout(clampedCellSize, viewport.offsetX, viewport.offsetY);
            this.clampViewport();
            return;
        }
        this.centerViewportOnCell(this.playerGridPos.col, this.playerGridPos.row);
    }

    public getMapDisplayConfig = (): MapDisplayConfig => ({ ...this.mapDisplayConfig });

    public setMapDisplayConfig = (config: Partial<MapDisplayConfig>): void => {
        this.mapDisplayConfig = {
            everythingDiscovered: typeof config.everythingDiscovered === 'boolean'
                ? config.everythingDiscovered
                : this.mapDisplayConfig.everythingDiscovered,
            fogOfWar: typeof config.fogOfWar === 'boolean'
                ? config.fogOfWar
                : this.mapDisplayConfig.fogOfWar,
        };
        this.noteRedrawCause('diagnosticsUiChange');
        this.invalidateWorldRedraw();
    };

    public updateSelectedCellFromPixel(pixelX: number, pixelY: number): boolean {
        const [col, row] = this.grid.pixelToGrid(pixelX, pixelY);
        const previous = this.selectedGridPos ? { ...this.selectedGridPos } : null;
        if (!this.grid.isValidPosition(col, row)) {
            this.selectedGridPos = null;
            const changed = previous !== null;
            if (changed) {
                this.noteHoverTileChangedThisFrame();
            }
            return changed;
        }

        this.selectedGridPos = { col, row };
        const changed = !previous || previous.col !== col || previous.row !== row;
        if (changed) {
            this.noteHoverTileChangedThisFrame();
        }
        return changed;
    }

    public clearSelectedCell = (): void => {
        if (this.selectedGridPos) {
            this.noteHoverTileChangedThisFrame();
        }
        this.selectedGridPos = null;
    };

    public getSelectedCellInfo(): SelectedWorldCellInfo | null {
        if (!this.selectedGridPos) {
            return null;
        }

        const terrain = this.getTerrain(this.selectedGridPos.col, this.selectedGridPos.row);
        if (!terrain) {
            return null;
        }

        const isVillage = this.hasLocationFeatureAt(this.selectedGridPos.col, this.selectedGridPos.row, 'village');
        const locationFeatureIds = this.getLocationFeatureIdsAt(this.selectedGridPos.col, this.selectedGridPos.row);
        const isCurrentVillage = isVillage
            && this.selectedGridPos.col === this.playerGridPos.col
            && this.selectedGridPos.row === this.playerGridPos.row;

        return {
            mode: 'world',
            col: this.selectedGridPos.col,
            row: this.selectedGridPos.row,
            terrainType: terrain.type,
            fogState: this.getFogState(this.selectedGridPos.col, this.selectedGridPos.row),
            isVisible: this.isCellVisible(this.selectedGridPos.col, this.selectedGridPos.row),
            isVillage,
            villageName: isVillage ? this.getVillageName(this.selectedGridPos.col, this.selectedGridPos.row) : null,
            villageStatus: isVillage ? (isCurrentVillage ? 'current' : 'mapped') : null,
            locationFeatureIds,
            isTraversable: terrain.type !== 'water',
        };
    }


    private findVillagePositionByNameInsensitive(name: string): GridPosition | null {
        const normalized = name.trim().toLowerCase();
        for (const key of this.villages.values()) {
            const [colText, rowText] = key.split(',');
            const col = Number(colText);
            const row = Number(rowText);
            if (this.getVillageName(col, row).toLowerCase() === normalized) {
                return { col, row };
            }
        }

        return null;
    }

    private resolveDirection(dx: number, dy: number): 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west' {
        const angle = Math.atan2(dy, dx);
        const slice = Math.round(angle / (Math.PI / 4));
        const dirs: Array<'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west' | 'north' | 'north-east'> = [
            'east',
            'south-east',
            'south',
            'south-west',
            'west',
            'north-west',
            'north',
            'north-east',
        ];
        return dirs[(slice + 8) % 8];
    }

    private findVillagePositionByName(name: string): GridPosition | null {
        for (const key of this.villages.values()) {
            const [colText, rowText] = key.split(',');
            const col = Number(colText);
            const row = Number(rowText);
            if (this.getVillageName(col, row) === name) {
                return { col, row };
            }
        }

        return null;
    }

}
