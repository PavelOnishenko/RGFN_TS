import GridMap from '../../utils/GridMap.js';
import { GridCell } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import WorldMapColorUtils from './WorldMapColorUtils.js';
import WorldMapGeometryUtils from './WorldMapGeometryUtils.js';

export default class WorldMapOverlayRenderer {
    public constructor(private readonly colorUtils: WorldMapColorUtils, private readonly geometryUtils: WorldMapGeometryUtils) {}

    public drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, this.colorUtils.mixColors(theme.worldMap.background, theme.ui.panelHighlight, 0.22));
        gradient.addColorStop(1, this.colorUtils.mixColors(theme.worldMap.background, theme.ui.primaryAccent, 0.08));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    public drawGrid(ctx: CanvasRenderingContext2D, grid: GridMap, width: number, height: number): void {
        ctx.save();
        ctx.strokeStyle = theme.worldMap.gridLines;
        ctx.setLineDash([4, 8]);
        ctx.lineWidth = 1;
        const startX = Math.max(0, grid.offsetX);
        const startY = Math.max(0, grid.offsetY);
        const endX = Math.min(width, grid.offsetX + (grid.columns * grid.cellSize));
        const endY = Math.min(height, grid.offsetY + (grid.rows * grid.cellSize));
        const startCol = Math.max(0, Math.floor((-grid.offsetX) / grid.cellSize));
        const endCol = Math.min(grid.columns, Math.ceil((width - grid.offsetX) / grid.cellSize));
        const startRow = Math.max(0, Math.floor((-grid.offsetY) / grid.cellSize));
        const endRow = Math.min(grid.rows, Math.ceil((height - grid.offsetY) / grid.cellSize));
        for (let col = startCol; col <= endCol; col++) {
            const x = grid.offsetX + (col * grid.cellSize);
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        for (let row = startRow; row <= endRow; row++) {
            const y = grid.offsetY + (row * grid.cellSize);
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    public drawPlayerMarker(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        const path = this.geometryUtils.createRoundedRectPath(
            cell.x + 3,
            cell.y + 3,
            cell.width - 6,
            cell.height - 6,
            Math.max(6, cell.width * 0.18),
        );
        ctx.save();
        ctx.fillStyle = this.colorUtils.withAlpha(theme.worldMap.playerMarker, 0.16);
        ctx.fill(path);
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;
        const characterScale = theme.worldMap.iconScale.character * Math.max(0.8, cell.width / 40);
        const markerHalfWidth = 6 * characterScale;
        const markerHeight = 8 * characterScale;
        ctx.fillStyle = theme.worldMap.playerMarker;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - markerHeight);
        ctx.lineTo(centerX - markerHalfWidth, centerY + markerHalfWidth);
        ctx.lineTo(centerX + markerHalfWidth, centerY + markerHalfWidth);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    public drawScaleLegend(ctx: CanvasRenderingContext2D, grid: GridMap, label: string, canvasWidth: number, canvasHeight: number): void {
        const legendWidth = Math.min(190, Math.max(110, grid.cellSize * 3.5));
        const legendHeight = 28;
        const x = Math.min(canvasWidth - legendWidth - 10, Math.max(10, grid.offsetX + 10));
        const y = Math.min(canvasHeight - legendHeight - 10, Math.max(10, grid.offsetY + 10));
        const legendPath = this.geometryUtils.createRoundedRectPath(x, y, legendWidth, legendHeight, 8);
        ctx.save();
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.primaryBg, 0.86);
        ctx.fill(legendPath);
        ctx.strokeStyle = this.colorUtils.withAlpha(theme.ui.primaryAccent, 0.3);
        ctx.lineWidth = 1.5;
        ctx.stroke(legendPath);
        ctx.fillStyle = theme.ui.textPrimary;
        ctx.font = '12px Georgia';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + 10, y + legendHeight / 2);
        ctx.restore();
    }

    public drawNamedLocationFocus(ctx: CanvasRenderingContext2D, cell: GridCell, label: string): void {
        const inset = Math.max(3, cell.width * 0.08);
        const path = this.geometryUtils.createRoundedRectPath(
            cell.x + inset,
            cell.y + inset,
            cell.width - (inset * 2),
            cell.height - (inset * 2),
            Math.max(5, cell.width * 0.16),
        );
        ctx.save();
        ctx.strokeStyle = this.colorUtils.withAlpha(theme.ui.locationNameColor, 0.95);
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.stroke(path);
        ctx.setLineDash([]);

        const textWidth = Math.min(220, Math.max(70, (label.length * 7) + 22));
        const textHeight = 24;
        const textX = Math.max(8, Math.min(cell.x, (cell.x + cell.width) - textWidth + 12));
        const textY = Math.max(8, cell.y - textHeight - 6);
        const bubble = this.geometryUtils.createRoundedRectPath(textX, textY, textWidth, textHeight, 8);
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.primaryBg, 0.95);
        ctx.fill(bubble);
        ctx.strokeStyle = this.colorUtils.withAlpha(theme.ui.locationNameColor, 0.75);
        ctx.lineWidth = 1.5;
        ctx.stroke(bubble);
        ctx.fillStyle = theme.ui.locationNameColor;
        ctx.font = 'bold 12px Georgia';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, textX + 10, textY + (textHeight / 2));
        ctx.restore();
    }

    public drawCursorMarker(ctx: CanvasRenderingContext2D, cell: GridCell, isVisible: boolean): void {
        const inset = Math.max(2, cell.width * 0.08);
        const path = this.geometryUtils.createRoundedRectPath(
            cell.x + inset,
            cell.y + inset,
            cell.width - (inset * 2),
            cell.height - (inset * 2),
            Math.max(5, cell.width * 0.18),
        );
        ctx.save();
        ctx.strokeStyle = this.colorUtils.withAlpha(theme.ui.warningColor, isVisible ? 0.95 : 0.7);
        ctx.lineWidth = Math.max(2, cell.width * 0.08);
        ctx.setLineDash([6, 4]);
        ctx.stroke(path);
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.warningColor, isVisible ? 0.16 : 0.08);
        ctx.fill(path);
        ctx.restore();
    }
}
