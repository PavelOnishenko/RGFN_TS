import { GridCell, TerrainType } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import WorldMapColorUtils from './WorldMapColorUtils.js';
import WorldMapGeometryUtils from './WorldMapGeometryUtils.js';

export default class WorldMapFeatureRenderer {
    public constructor(private readonly colorUtils: WorldMapColorUtils, private readonly geometryUtils: WorldMapGeometryUtils) {}

    public drawVillageRoadPath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, alpha: number): void {
        if (points.length < 2) {return;}
        const clampedAlpha = Math.max(0.3, Math.min(1, alpha));
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.colorUtils.withAlpha('#f7d969', 0.18 * clampedAlpha);
        ctx.lineWidth = 4;
        ctx.beginPath();
        this.traceSmoothPath(ctx, points);
        ctx.stroke();
        ctx.strokeStyle = this.colorUtils.withAlpha('#f8db66', 0.84 * clampedAlpha);
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        this.traceSmoothPath(ctx, points);
        ctx.stroke();
        ctx.restore();
    }


    public drawWaterCrossingRoadPath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, alpha: number): void {
        if (points.length < 2) {return;}
        const clampedAlpha = Math.max(0.3, Math.min(1, alpha));
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.colorUtils.withAlpha('#8fd4ff', 0.62 * clampedAlpha);
        ctx.lineWidth = 1.4;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        this.traceSmoothPath(ctx, points);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    public drawNamedLocation(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        label: string,
        terrainType: TerrainType,
        options: { emphasized: boolean; showLabel: boolean },
    ): void {
        const centerX = cell.x + (cell.width / 2);
        const centerY = cell.y + (cell.height / 2);
        const alpha = options.emphasized ? 0.95 : 0.72;
        ctx.save();
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.locationNameColor, alpha);
        ctx.strokeStyle = this.colorUtils.withAlpha(theme.ui.primaryBg, options.emphasized ? 0.95 : 0.72);
        ctx.lineWidth = 1.4;
        const size = Math.max(5, cell.width * 0.17);
        if (terrainType === 'forest') {this.drawNamedLocationGrove(ctx, centerX, centerY, size);}
        else if (terrainType === 'desert') {this.drawNamedLocationCairn(ctx, centerX, centerY, size);}
        else {this.drawNamedLocationObelisk(ctx, centerX, centerY, size);}
        if (options.showLabel) {this.drawNamedLocationLabel(ctx, cell, label, alpha);}
        ctx.restore();
    }

    public drawVillage(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number): void {
        const villageScale = theme.worldMap.iconScale.village;
        ctx.save();
        ctx.shadowColor = this.colorUtils.withAlpha(this.colorUtils.mixColors(theme.ui.warningColor, theme.ui.panelHighlight, 0.55), 0.95);
        ctx.shadowBlur = 18;
        ctx.fillStyle = this.colorUtils.withAlpha(this.colorUtils.mixColors(theme.ui.warningColor, theme.ui.panelHighlight, 0.3), glow);
        ctx.beginPath();
        ctx.arc(x, y + 1, 10 * villageScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = this.colorUtils.withAlpha(this.colorUtils.mixColors(theme.ui.primaryAccent, theme.ui.secondaryAccent, 0.15), 0.65);
        ctx.fillRect(x - (8 * villageScale), y, 16 * villageScale, 11 * villageScale);
        ctx.fillStyle = this.colorUtils.withAlpha(this.colorUtils.mixColors(theme.ui.warningColor, theme.ui.secondaryAccent, 0.35), glow);
        ctx.beginPath();
        ctx.moveTo(x - (10 * villageScale), y);
        ctx.lineTo(x, y - (12 * villageScale));
        ctx.lineTo(x + (10 * villageScale), y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.panelHighlight, 0.98);
        ctx.fillRect(x - (3 * villageScale), y + (3 * villageScale), 6 * villageScale, 8 * villageScale);
    }

    public drawFerryDock(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number): void {
        ctx.save();
        ctx.strokeStyle = this.colorUtils.withAlpha('#f8db66', 0.85 * glow);
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.primaryBg, 0.78);
        ctx.lineWidth = 1.2;
        ctx.fillRect(x - 5, y + 2, 10, 5);
        ctx.strokeRect(x - 5, y + 2, 10, 5);
        ctx.beginPath();
        ctx.arc(x, y + 1, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = this.colorUtils.withAlpha('#f7d969', 0.95);
        ctx.fill();
        ctx.restore();
    }

    private traceSmoothPath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>): void {
        ctx.moveTo(points[0].x, points[0].y);
        if (points.length === 2) {return ctx.lineTo(points[1].x, points[1].y);}
        for (let index = 1; index < points.length - 1; index += 1) {
            const current = points[index];
            const next = points[index + 1];
            ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) * 0.5, (current.y + next.y) * 0.5);
        }
        const secondLast = points[points.length - 2];
        const last = points[points.length - 1];
        ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
    }

    private drawNamedLocationLabel(ctx: CanvasRenderingContext2D, cell: GridCell, label: string, alpha: number): void {
        const textWidth = Math.min(220, Math.max(70, (label.length * 7) + 22));
        const textHeight = 24;
        const textX = Math.max(8, Math.min(cell.x, (cell.x + cell.width) - textWidth + 12));
        const textY = Math.max(8, cell.y - textHeight - 6);
        const bubble = this.geometryUtils.createRoundedRectPath(textX, textY, textWidth, textHeight, 8);
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.primaryBg, 0.92);
        ctx.fill(bubble);
        ctx.strokeStyle = this.colorUtils.withAlpha(theme.ui.locationNameColor, Math.min(1, alpha + 0.05));
        ctx.lineWidth = 1.4;
        ctx.stroke(bubble);
        ctx.fillStyle = theme.ui.locationNameColor;
        ctx.font = 'bold 12px Georgia';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, textX + 10, textY + (textHeight / 2));
    }

    private drawNamedLocationObelisk(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        ctx.beginPath();
        ctx.moveTo(x, y - (size * 1.3));
        ctx.lineTo(x - (size * 0.55), y + (size * 0.65));
        ctx.lineTo(x + (size * 0.55), y + (size * 0.65));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y - (size * 0.2), Math.max(1.6, size * 0.18), 0, Math.PI * 2);
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.panelHighlight, 0.92);
        ctx.fill();
    }

    private drawNamedLocationGrove(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        ctx.beginPath();
        ctx.arc(x - (size * 0.45), y - (size * 0.15), size * 0.55, 0, Math.PI * 2);
        ctx.arc(x + (size * 0.45), y - (size * 0.15), size * 0.55, 0, Math.PI * 2);
        ctx.arc(x, y - (size * 0.55), size * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(x - (size * 0.18), y + (size * 0.25), size * 0.36, size * 0.7);
    }

    private drawNamedLocationCairn(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        ctx.beginPath();
        ctx.ellipse(x, y + (size * 0.3), size * 0.8, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, y - (size * 0.25), size * 0.58, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, y - (size * 0.75), size * 0.38, size * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}
