import GridMap from '../../../utils/GridMap.js';
import { FogState, TerrainData, GridCell, TerrainNeighbors, TerrainType } from '../../../types/game.js';
import WorldMapCellRenderer from '../WorldMapCellRenderer.js';
import WorldMapColorUtils from '../WorldMapColorUtils.js';
import WorldMapFeatureRenderer from '../WorldMapFeatureRenderer.js';
import WorldMapGeometryUtils from '../WorldMapGeometryUtils.js';
import WorldMapOverlayRenderer from '../WorldMapOverlayRenderer.js';
import WorldMapTerrainPatternRenderer from '../WorldMapTerrainPatternRenderer.js';

export default class WorldMapRenderer {
    private readonly featureRenderer: WorldMapFeatureRenderer;
    private readonly cellRenderer: WorldMapCellRenderer;
    private readonly overlayRenderer: WorldMapOverlayRenderer;

    public constructor() {
        const colorUtils = new WorldMapColorUtils();
        const geometryUtils = new WorldMapGeometryUtils();
        const patternRenderer = new WorldMapTerrainPatternRenderer(colorUtils);
        this.featureRenderer = new WorldMapFeatureRenderer(colorUtils, geometryUtils);
        this.cellRenderer = new WorldMapCellRenderer(colorUtils, geometryUtils, patternRenderer);
        this.overlayRenderer = new WorldMapOverlayRenderer(colorUtils, geometryUtils);
    }

    public drawVillageRoadPath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, alpha: number): void {
        this.featureRenderer.drawVillageRoadPath(ctx, points, alpha);
    }

    public drawWaterCrossingRoadPath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, alpha: number): void {
        this.featureRenderer.drawWaterCrossingRoadPath(ctx, points, alpha);
    }

    public drawNamedLocation(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        label: string,
        terrainType: TerrainType,
        options: { emphasized: boolean; showLabel: boolean },
    ): void {
        this.featureRenderer.drawNamedLocation(ctx, cell, label, terrainType, options);
    }

    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        this.overlayRenderer.drawBackground(ctx, width, height);
    }

    public drawGrid(ctx: CanvasRenderingContext2D, grid: GridMap, width: number, height: number): void {
        this.overlayRenderer.drawGrid(ctx, grid, width, height);
    }

    public drawCell(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        fogState: FogState,
        terrain: TerrainData | undefined,
        neighbors?: TerrainNeighbors,
        options: { showFogOverlay?: boolean; detailLevel?: 'full' | 'medium' | 'low' } = {},
    ): void {
        this.cellRenderer.drawCell(ctx, cell, fogState, terrain, neighbors, options);
    }

    public drawVillage(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number): void {
        this.featureRenderer.drawVillage(ctx, x, y, glow);
    }

    public drawFerryDock(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number): void {
        this.featureRenderer.drawFerryDock(ctx, x, y, glow);
    }

    public drawPlayerMarker(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        this.overlayRenderer.drawPlayerMarker(ctx, cell);
    }

    public drawScaleLegend(ctx: CanvasRenderingContext2D, grid: GridMap, label: string, canvasWidth: number, canvasHeight: number): void {
        this.overlayRenderer.drawScaleLegend(ctx, grid, label, canvasWidth, canvasHeight);
    }

    public drawNamedLocationFocus(ctx: CanvasRenderingContext2D, cell: GridCell, label: string): void {
        this.overlayRenderer.drawNamedLocationFocus(ctx, cell, label);
    }

    public drawCursorMarker(ctx: CanvasRenderingContext2D, cell: GridCell, isVisible: boolean): void {
        this.overlayRenderer.drawCursorMarker(ctx, cell, isVisible);
    }
}
