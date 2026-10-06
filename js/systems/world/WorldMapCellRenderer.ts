import { FogState, TerrainData, GridCell, TerrainNeighbors, TerrainType } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import WorldMapColorUtils from './WorldMapColorUtils.js';
import WorldMapGeometryUtils from './WorldMapGeometryUtils.js';
import WorldMapTerrainPatternRenderer from './WorldMapTerrainPatternRenderer.js';

export default class WorldMapCellRenderer {
    public constructor(
        private readonly colorUtils: WorldMapColorUtils,
        private readonly geometryUtils: WorldMapGeometryUtils,
        private readonly patternRenderer: WorldMapTerrainPatternRenderer,
    ) {}

    public drawCell(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        fogState: FogState,
        terrain: TerrainData | undefined,
        neighbors?: TerrainNeighbors,
        options: { showFogOverlay?: boolean; detailLevel?: 'full' | 'medium' | 'low' } = {},
    ): void {
        const detailLevel = options.detailLevel ?? 'full';
        if (fogState === 'unknown') {return this.drawUnknownCell(ctx, cell, detailLevel);}
        if (!terrain) {return;}

        const brightness = fogState === 'discovered' ? 1 : terrain.type === 'water' ? 0.84 : 0.72;
        if (detailLevel === 'low') {
            return this.drawLowDetailCell(ctx, cell, terrain, brightness, fogState === 'hidden' && options.showFogOverlay !== false);
        }

        const path = this.geometryUtils.createTerrainPath(cell, neighbors);
        this.drawTerrain(ctx, cell, terrain, brightness, path, detailLevel);
        if (fogState === 'hidden' && options.showFogOverlay !== false) {this.drawHiddenOverlay(ctx, path, terrain.type);}
    }

    private drawUnknownCell(ctx: CanvasRenderingContext2D, cell: GridCell, detailLevel: 'full' | 'medium' | 'low'): void {
        ctx.save();
        ctx.fillStyle = theme.worldMap.unknown;
        if (detailLevel === 'low' || cell.width <= 12) {
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            ctx.restore();
            return;
        }

        const path = this.geometryUtils.createCellRectPath(cell);
        ctx.fill(path);
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.primaryAccent, 0.35);
        ctx.font = `${Math.max(12, Math.floor(cell.width * 0.45))}px Georgia`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const questionMarkOffset = theme.worldMap.questionMarkOffset;
        ctx.fillText('?', cell.x + (cell.width / 2) + questionMarkOffset.x, cell.y + (cell.height / 2) + questionMarkOffset.y);
        ctx.restore();
    }

    private drawTerrain(ctx: CanvasRenderingContext2D, cell: GridCell, terrain: TerrainData, brightness: number, path: Path2D, detailLevel: 'full' | 'medium'): void {
        ctx.save();
        ctx.fillStyle = this.colorUtils.adjustColorBrightness(terrain.color, brightness);
        ctx.fill(path);
        if (detailLevel === 'medium') {
            ctx.restore();
            return;
        }

        ctx.clip(path);
        this.patternRenderer.drawTerrainTexture(ctx, cell, terrain.pattern, brightness, terrain.seed);
        this.patternRenderer.drawTerrainIcon(ctx, cell, terrain.type, brightness);
        ctx.restore();
    }

    private drawLowDetailCell(ctx: CanvasRenderingContext2D, cell: GridCell, terrain: TerrainData, brightness: number, showHiddenOverlay: boolean): void {
        ctx.save();
        ctx.fillStyle = this.colorUtils.adjustColorBrightness(terrain.color, brightness);
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
        if (showHiddenOverlay) {
            ctx.fillStyle = terrain.type === 'water'
                ? this.colorUtils.withAlpha(this.colorUtils.mixColors(theme.worldMap.terrain.water, theme.ui.panelHighlight, 0.18), 0.1)
                : this.colorUtils.withAlpha(theme.ui.primaryAccent, 0.22);
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
        }
        ctx.restore();
    }

    private drawHiddenOverlay(ctx: CanvasRenderingContext2D, path: Path2D, terrainType: TerrainType): void {
        const overlayColor = terrainType === 'water'
            ? this.colorUtils.withAlpha(this.colorUtils.mixColors(theme.worldMap.terrain.water, theme.ui.panelHighlight, 0.18), 0.1)
            : this.colorUtils.withAlpha(theme.ui.primaryAccent, 0.3);
        ctx.save();
        ctx.fillStyle = overlayColor;
        ctx.fill(path);
        ctx.restore();
    }
}
