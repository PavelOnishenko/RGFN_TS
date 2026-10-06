// @ts-nocheck
/* eslint-disable style-guide/file-length-warning, style-guide/function-length-error */
import WorldMapMovementAndViewport from './WorldMapMovementAndViewport.js';
import { theme } from '../../../config/ThemeConfig.js';
import { generateVillageName } from '../VillageNameGenerator.js';
import { FOG_STATE } from './WorldMapCore.js';
export default class WorldMapVillageNavigationAndRender extends WorldMapMovementAndViewport {
    private getProfileNow(): number {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }

    private profileSection<T>(
        section: 'drawTotal' | 'visibleTileCalculation' | 'terrain' | 'roads' | 'entities' | 'cursorSelection' | 'overlayDebug',
        work: () => T,
    ): T {
        if (!this.isDrawProfilingEnabled()) {
            return work();
        }
        const start = this.getProfileNow();
        const result = work();
        this.recordDrawProfileSection(section, this.getProfileNow() - start);
        return result;
    }

    // eslint-disable-next-line style-guide/function-length-warning
    private clampViewport(): void {
        const mapWidth = this.grid.columns * this.grid.cellSize;
        const mapHeight = this.grid.rows * this.grid.cellSize;
        const maxOffsetX = theme.worldMap.gridOffset.x;
        const maxOffsetY = theme.worldMap.gridOffset.y;
        const minOffsetX = this.canvasWidth - mapWidth + theme.worldMap.gridOffset.x;
        const minOffsetY = this.canvasHeight - mapHeight + theme.worldMap.gridOffset.y;

        let offsetX = this.grid.offsetX;
        let offsetY = this.grid.offsetY;

        if (mapWidth <= this.canvasWidth) {
            offsetX = Math.round((this.canvasWidth - mapWidth) / 2) + theme.worldMap.gridOffset.x;
        } else {
            offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, offsetX));
        }

        if (mapHeight <= this.canvasHeight) {
            offsetY = Math.round((this.canvasHeight - mapHeight) / 2) + theme.worldMap.gridOffset.y;
        } else {
            offsetY = Math.max(minOffsetY, Math.min(maxOffsetY, offsetY));
        }

        this.grid.updateLayout(this.grid.cellSize, offsetX, offsetY);
    }

    private getVisibleBounds(): { startCol: number; endCol: number; startRow: number; endRow: number } {
        const marginTiles = 2;
        const startCol = Math.max(0, Math.floor((-this.grid.offsetX) / this.grid.cellSize) - marginTiles);
        const endCol = Math.min(this.grid.columns - 1, Math.ceil((this.canvasWidth - this.grid.offsetX) / this.grid.cellSize) + marginTiles);
        const startRow = Math.max(0, Math.floor((-this.grid.offsetY) / this.grid.cellSize) - marginTiles);
        const endRow = Math.min(this.grid.rows - 1, Math.ceil((this.canvasHeight - this.grid.offsetY) / this.grid.cellSize) + marginTiles);
        return { startCol, endCol, startRow, endRow };
    }

    public getPlayerPixelPosition = (): [number, number] => this.grid.gridToPixel(this.playerGridPos.col, this.playerGridPos.row);
    public isRoadAt(col: number, row: number): boolean {
        if (!this.grid.isValidPosition(col, row)) {return false;}
        return this.roadIndexSet.has(this.getCellIndex(col, row));
    }

    public isPlayerOnRoad = (): boolean => this.isRoadAt(this.playerGridPos.col, this.playerGridPos.row);
    public isFerryDockAt = (col: number, row: number): boolean => this.hasLocationFeatureAt(col, row, 'ferry-dock');
    public isPlayerOnFerryDock = (): boolean => this.isFerryDockAt(this.playerGridPos.col, this.playerGridPos.row);

    public getFerryRoutesAtPlayerPosition(): Array<{ from: GridPosition; to: GridPosition; waterCells: number }> {
        const from = { col: this.playerGridPos.col, row: this.playerGridPos.row };
        const routes = this.ferryDockRoutesByIndex.get(this.getCellIndex(from.col, from.row)) ?? [];
        return routes.map((route) => ({ from, to: route.to, waterCells: route.waterCells }));
    }

    public travelByFerryAtPlayerPosition(routeIndex: number): { traveled: boolean; from?: GridPosition; to?: GridPosition; waterCells?: number } {
        const routes = this.getFerryRoutesAtPlayerPosition();
        if (routes.length === 0) {return { traveled: false };}
        const route = routes[Math.max(0, Math.min(routeIndex, routes.length - 1))];
        if (!route) {return { traveled: false };}
        const destinationKey = this.getCellKey(route.to.col, route.to.row);
        this.playerGridPos = { col: route.to.col, row: route.to.row };
        this.visitedCells.add(destinationKey);
        this.refreshVisibility();
        this.ensureCellIsVisible(route.to.col, route.to.row);
        return { traveled: true, from: route.from, to: route.to, waterCells: route.waterCells };
    }

    public getSettlementNameAt(col: number, row: number): string {
        if (this.villageIndexSet.has(this.getCellIndex(col, row))) {
            return this.getVillageName(col, row);
        }
        const namedLocation = Array.from(this.namedLocations.values()).find((location) => location.position.col === col && location.position.row === row);
        if (namedLocation) {
            return namedLocation.name;
        }
        return `Dock (${col}, ${row})`;
    }

    public getCurrentTerrain = (): TerrainData => this.getTerrain(this.playerGridPos.col, this.playerGridPos.row) ?? { type: 'grass', color: theme.worldMap.terrain.grass, pattern: 'plain', elevation: 0.5, moisture: 0.5, heat: 0.5, seed: 0 };

    public getVillageNameAtPlayerPosition = (): string => this.getVillageName(this.playerGridPos.col, this.playerGridPos.row);
    public getKnownVillages = (): KnownVillage[] => Array.from(this.villages.values())
        .map((key) => {
            const [colText, rowText] = key.split(',');
            const col = Number(colText);
            const row = Number(rowText);
            if (this.getFogState(col, row) === FOG_STATE.UNKNOWN) {
                return null;
            }
            const terrain = this.getTerrain(col, row)?.type ?? 'grass';
            const isCurrent = col === this.playerGridPos.col && row === this.playerGridPos.row;
            return { name: this.getVillageName(col, row), col, row, terrain, status: isCurrent ? 'current' : 'mapped' };
        })
        .filter((entry): entry is KnownVillage => entry !== null)
        .sort((left, right) => left.name.localeCompare(right.name));

    public getVillageDirectionHintFromPlayer(rawSettlementName: string): WorldVillageDirectionHint {
        const settlementName = rawSettlementName.trim();
        const position = this.findVillagePositionByNameInsensitive(settlementName);
        if (!position) {
            return { settlementName, exists: false };
        }

        const dx = position.col - this.playerGridPos.col;
        const dy = position.row - this.playerGridPos.row;
        return { settlementName, exists: true, direction: this.resolveDirection(dx, dy), distanceCells: Math.round(Math.sqrt((dx * dx) + (dy * dy))) };
    }

    public getNearbyVillagesFromVillage(villageName: string, maxDistanceCells: number): Array<{
        name: string;
        col: number;
        row: number;
        direction: 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west';
        distanceCells: number;
    }> {
        const normalizedVillageName = villageName.trim().toLocaleLowerCase();
        const sourceVillage = this.findVillagePositionByNameInsensitive(villageName);
        const clampedDistance = Math.max(0, Math.floor(maxDistanceCells));
        if (!sourceVillage || !normalizedVillageName || clampedDistance <= 0) {
            return [];
        }

        return Array.from(this.villages.values())
            .map((key) => {
                const [colText, rowText] = key.split(',');
                const col = Number(colText);
                const row = Number(rowText);
                const name = this.getVillageName(col, row);
                if (name.trim().toLocaleLowerCase() === normalizedVillageName) {
                    return null;
                }
                const dx = col - sourceVillage.col;
                const dy = row - sourceVillage.row;
                const distanceCells = Math.round(Math.sqrt((dx * dx) + (dy * dy)));
                if (distanceCells > clampedDistance) {
                    return null;
                }
                return { name, col, row, distanceCells, direction: this.resolveDirection(dx, dy) };
            })
            .filter((entry): entry is {
                name: string;
                col: number;
                row: number;
                direction: 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west';
                distanceCells: number;
            } => entry !== null)
            .sort((left, right) => {
                if (left.distanceCells !== right.distanceCells) {
                    return left.distanceCells - right.distanceCells;
                }
                return left.name.localeCompare(right.name);
            });
    }

    public getAllVillageNames = (): string[] => Array.from(this.villages.values())
        .map((key) => {
            const [colText, rowText] = key.split(',');
            return this.getVillageName(Number(colText), Number(rowText));
        })
        .sort((left, right) => left.localeCompare(right));

    public getAllVillagePlacements = (): Array<{ name: string; col: number; row: number }> => Array.from(this.villages.values())
        .map((key) => {
            const [colText, rowText] = key.split(',');
            const col = Number(colText);
            const row = Number(rowText);
            return { name: this.getVillageName(col, row), col, row };
        })
        .sort((left, right) => left.name.localeCompare(right.name));

    private getVillageName(col: number, row: number): string {
        const seed = this.hashSeed((col + 11) * 92837111, (row + 17) * 689287499, 14057);
        return generateVillageName(seed);
    }

    public isPlayerOnVillage = (): boolean => this.hasLocationFeatureAt(this.playerGridPos.col, this.playerGridPos.row, 'village');

    public markVillageAtPlayerPosition(): void {
        const key = this.getCellKey(this.playerGridPos.col, this.playerGridPos.row);
        this.villages.add(key);
        this.villageIndexSet.add(this.getCellIndex(this.playerGridPos.col, this.playerGridPos.row));
        this.addLocationFeatureAt(this.playerGridPos.col, this.playerGridPos.row, 'village');
    }

    public isPlayerOnEdge(): boolean {
        const { columns, rows } = this.grid.getDimensions();
        const { col, row } = this.playerGridPos;
        return col === 0 || row === 0 || col === columns - 1 || row === rows - 1;
    }

    private getRenderDetailLevel(bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): 'full' | 'medium' | 'low' {
        const visibleColumns = Math.max(0, bounds.endCol - bounds.startCol + 1);
        const visibleRows = Math.max(0, bounds.endRow - bounds.startRow + 1);
        const visibleCellCount = visibleColumns * visibleRows;
        if (this.grid.cellSize <= 10 || (!this.mapDisplayConfig.fogOfWar && visibleCellCount >= 2500)) {return 'low';}
        // Keep medium detail over a wider "mid-zoom" band to avoid expensive full-detail
        // neighbor sampling on large visible windows (observed profiler spike around ~70-84% zoom).
        if (this.grid.cellSize <= 18 || visibleCellCount >= 900) {return 'medium';}
        return 'full';
    }

    private getRenderTier(detailLevel: 'full' | 'medium' | 'low'): 'near' | 'mid' | 'far' {
        if (detailLevel === 'full') {return 'near';}
        if (detailLevel === 'medium') {return 'mid';}
        return 'far';
    }

    public draw(ctx: CanvasRenderingContext2D, _renderer: any): void {
        this.profileSection('drawTotal', () => {
            if (this.areAllRenderLayersDisabled()) {
                ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
                this.approxDrawCallsThisFrame += 1;
                return;
            }
            const bounds = this.profileSection('visibleTileCalculation', () => this.getVisibleBounds());
            this.visibleTileCountThisFrame = Math.max(0, (bounds.endCol - bounds.startCol + 1) * (bounds.endRow - bounds.startRow + 1));
            const detailLevel = this.getRenderDetailLevel(bounds);
            const currentTier = this.getRenderTier(detailLevel);
            if (this.lastRenderTier !== currentTier) {
                this.lastRenderTier = currentTier;
                this.noteRedrawCause('zoomChange');
            }
            const overlayOnlyRedraw = !this.worldNeedsRedraw && this.overlayNeedsRedraw;
            if (overlayOnlyRedraw && this.staticFrameCanvas) {
                ctx.drawImage(this.staticFrameCanvas, 0, 0);
                this.approxDrawCallsThisFrame += 1;
                this.profileSection('entities', () => this.drawCharacterMarker(ctx));
                this.profileSection('cursorSelection', () => this.drawSelectionMarker(ctx));
                this.noteDynamicRedraw();
                return;
            }

            this.renderer.drawBackground(ctx, this.canvasWidth, this.canvasHeight);
            this.approxDrawCallsThisFrame += 1;
            this.drawOptionalTerrainLayers(ctx, bounds, detailLevel);
            this.drawOptionalRoadLayer(ctx, bounds);
            this.drawOptionalLocationLayers(ctx, bounds);
            this.drawOptionalScaleLegend(ctx);

            const staticCtx = this.ensureStaticFrameCanvas(this.canvasWidth, this.canvasHeight);
            if (staticCtx) {
                if (typeof staticCtx.clearRect === 'function') {
                    staticCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
                }
                if (typeof staticCtx.drawImage === 'function') {
                    staticCtx.drawImage(ctx.canvas, 0, 0);
                }
            }

            this.profileSection('entities', () => this.drawCharacterMarker(ctx));
            this.profileSection('cursorSelection', () => this.drawSelectionMarker(ctx));
            this.noteDynamicRedraw();
        });
    }

    private readonly areAllRenderLayersDisabled = (): boolean => !this.renderLayerToggles.terrain
            && !this.renderLayerToggles.roads
            && !this.renderLayerToggles.locations
            && !this.renderLayerToggles.character
            && !this.renderLayerToggles.selectionCursor;

    private drawOptionalTerrainLayers(
        ctx: CanvasRenderingContext2D,
        bounds: { startCol: number; endCol: number; startRow: number; endRow: number },
        detailLevel: 'full' | 'medium' | 'low',
    ): void {
        if (!this.renderLayerToggles.terrain) {
            return;
        }
        this.profileSection('terrain', () => this.drawTerrainLayer(ctx, bounds, detailLevel));
        this.profileSection('overlayDebug', () => this.drawDayNightTint(ctx));
    }

    private drawOptionalRoadLayer(ctx: CanvasRenderingContext2D, bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): void {
        if (this.renderLayerToggles.roads) {
            const shouldUseRoadCache = this.grid.cellSize <= 18;
            this.profileSection('roads', () => {
                if (!shouldUseRoadCache || !this.drawRoadLayerFromCache(ctx, bounds, this.grid.cellSize <= 10 ? 'low' : 'medium')) {
                    this.drawVillageRoads(ctx, bounds);
                }
            });
        }
    }

    private drawOptionalLocationLayers(ctx: CanvasRenderingContext2D, bounds: { startCol: number; endCol: number; startRow: number; endRow: number }): void {
        if (!this.renderLayerToggles.locations) {
            return;
        }
        this.profileSection('overlayDebug', () => this.drawLocationFeatures(ctx, bounds));
        this.profileSection('overlayDebug', () => this.drawNamedLocations(ctx, bounds));
        this.profileSection('overlayDebug', () => this.drawNamedLocationFocus(ctx));
    }

    private drawOptionalScaleLegend(ctx: CanvasRenderingContext2D): void {
        if (this.renderLayerToggles.terrain) {
            this.renderer.drawScaleLegend(ctx, this.grid, `${theme.worldMap.cellTravelMinutes} min walk / cell`, this.canvasWidth, this.canvasHeight);
        }
    }

    private drawDayNightTint(ctx: CanvasRenderingContext2D): void {
        if (this.daylightFactor < 1) {
            const darkness = Math.max(0, 1 - this.daylightFactor);
            if (darkness > 0.01) {
                ctx.fillStyle = `rgba(14, 20, 36, ${Math.min(0.62, darkness * 0.72).toFixed(3)})`;
                ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            }
            return;
        }
        const brightness = Math.max(0, this.daylightFactor - 1);
        if (brightness > 0.01) {
            ctx.fillStyle = `rgba(255, 248, 220, ${Math.min(0.22, brightness * 0.42).toFixed(3)})`;
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
    }

    private drawTerrainLayer(
        ctx: CanvasRenderingContext2D,
        bounds: { startCol: number; endCol: number; startRow: number; endRow: number },
        detailLevel: 'full' | 'medium' | 'low',
    ): void {
        const shouldUseTerrainCache = detailLevel === 'low' || detailLevel === 'medium';
        const terrainRenderedFromCache = shouldUseTerrainCache && this.drawTerrainLayerFromCache(ctx, bounds, detailLevel);
        if (!terrainRenderedFromCache) {
            this.drawTerrainCells(ctx, bounds, detailLevel);
            this.noteStaticRedraw();
            return;
        }
        this.drawFogOverlayForVisibleCells(ctx, bounds, detailLevel);
    }

    private drawTerrainCells(ctx: CanvasRenderingContext2D, bounds: { startCol: number; endCol: number; startRow: number; endRow: number }, detailLevel: 'full' | 'medium' | 'low'): void {
        for (let row = bounds.startRow; row <= bounds.endRow; row += 1) {
            for (let col = bounds.startCol; col <= bounds.endCol; col += 1) {
                const cell = this.grid.cells[this.getCellIndex(col, row)];
                const terrain = this.getTerrain(col, row);
                if (!cell) {continue;}
                this.renderer.drawCell(
                    ctx, cell, this.getFogState(col, row), terrain,
                    detailLevel === 'full' && terrain ? this.getTerrainNeighbors(col, row, terrain.type) : undefined,
                    { showFogOverlay: this.mapDisplayConfig.fogOfWar, detailLevel },
                );
                this.drawnTileCountThisFrame += 1;
                this.approxDrawCallsThisFrame += 1;
            }
        }
    }

    private drawCharacterMarker(ctx: CanvasRenderingContext2D): void {
        if (!this.renderLayerToggles.character) {
            return;
        }
        const playerCell = this.grid.getCellAt(this.playerGridPos.col, this.playerGridPos.row);
        if (playerCell) {
            this.renderer.drawPlayerMarker(ctx, playerCell);
            this.approxDrawCallsThisFrame += 1;
        }
    }

    private drawSelectionMarker(ctx: CanvasRenderingContext2D): void {
        const selectedCell = this.selectedGridPos ? this.grid.getCellAt(this.selectedGridPos.col, this.selectedGridPos.row) : null;
        if (this.renderLayerToggles.selectionCursor && selectedCell) {
            this.renderer.drawCursorMarker(ctx, selectedCell, this.isCellVisible(selectedCell.col, selectedCell.row));
            this.approxDrawCallsThisFrame += 1;
        }
    }

}
