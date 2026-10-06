import { GridCell, TerrainType } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import WorldMapColorUtils from './WorldMapColorUtils.js';

export default class WorldMapTerrainPatternRenderer {
    public constructor(private readonly colorUtils: WorldMapColorUtils) {}

    public drawTerrainTexture(ctx: CanvasRenderingContext2D, cell: GridCell, pattern: string, brightness: number, seed: number): void {
        const textureColor = this.colorUtils.withAlpha(this.colorUtils.mixColors(theme.ui.primaryAccent, theme.ui.panelHighlight, 0.25), 0.14 * brightness);
        ctx.strokeStyle = textureColor;
        ctx.fillStyle = textureColor;
        ctx.lineWidth = 1;

        if (pattern === 'dots') {
            return this.drawDotsPattern(ctx, cell, brightness);
        }
        if (pattern === 'lines') {
            return this.drawLinesPattern(ctx, cell, brightness);
        }
        if (pattern === 'cross') {
            return this.drawCrossPattern(ctx, cell, brightness);
        }
        if (pattern === 'waves') {
            return this.drawWavePattern(ctx, cell, brightness, seed);
        }
        if (pattern === 'dunes') {
            return this.drawDunePattern(ctx, cell, brightness);
        }
        if (pattern === 'groves') {
            return this.drawGrovesPattern(ctx, cell, brightness, seed);
        }
        if (pattern === 'ridges') {
            this.drawRidgesPattern(ctx, cell, brightness);
        }
    }

    public drawTerrainIcon(ctx: CanvasRenderingContext2D, cell: GridCell, type: TerrainType, brightness: number): void {
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.primaryAccent, 0.18 * brightness);
        if (type === 'mountain') {
            return this.drawMountain(ctx, centerX, centerY, cell.width);
        }
        if (type === 'forest') {
            return this.drawForest(ctx, centerX, centerY, cell.width);
        }
        if (type === 'water') {
            return this.drawWater(ctx, centerX, centerY, cell.width);
        }
        if (type === 'desert') {
            this.drawDesert(ctx, centerX, centerY, cell.width);
        }
    }

    private drawDotsPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        const seedBase = (cell.col * 73856093) ^ (cell.row * 19349663);
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.primaryAccent, 0.07 * brightness);
        for (let index = 0; index < 10; index += 1) {
            const offsetX = (0.1 + (this.colorUtils.seededRandom(seedBase + index) * 0.8)) * cell.width;
            const offsetY = (0.1 + (this.colorUtils.seededRandom(seedBase + (index * 11)) * 0.8)) * cell.height;
            const radius = 0.7 + (this.colorUtils.seededRandom(seedBase + (index * 19)) * 1.1);
            ctx.beginPath();
            ctx.arc(cell.x + offsetX, cell.y + offsetY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawLinesPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        const seedBase = (cell.col * 73856093) ^ (cell.row * 19349663);
        ctx.strokeStyle = this.colorUtils.withAlpha(theme.ui.primaryAccent, 0.1 * brightness);
        for (let index = 0; index < 4; index += 1) {
            const startX = cell.x + (cell.width * (0.12 + (index * 0.22)));
            const sway = (this.colorUtils.seededRandom(seedBase + (index * 17)) - 0.5) * (cell.width * 0.16);
            ctx.beginPath();
            ctx.moveTo(startX, cell.y + 3);
            ctx.quadraticCurveTo(startX + sway, cell.y + (cell.height * 0.5), startX + (sway * 0.35), cell.y + cell.height - 3);
            ctx.stroke();
        }
    }

    private drawCrossPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        const seedBase = (cell.col * 73856093) ^ (cell.row * 19349663);
        ctx.strokeStyle = this.colorUtils.withAlpha(theme.ui.primaryAccent, 0.08 * brightness);
        for (let index = 0; index < 5; index += 1) {
            const x1 = cell.x + (this.colorUtils.seededRandom(seedBase + (index * 7)) * cell.width);
            const y1 = cell.y + (this.colorUtils.seededRandom(seedBase + (index * 13)) * cell.height);
            const x2 = cell.x + (this.colorUtils.seededRandom(seedBase + (index * 19)) * cell.width);
            const y2 = cell.y + (this.colorUtils.seededRandom(seedBase + (index * 23)) * cell.height);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    private drawWavePattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number, seed: number): void {
        ctx.strokeStyle = this.colorUtils.withAlpha(theme.ui.panelHighlight, 0.18 * brightness);
        for (let row = 0; row < 3; row++) {
            const y = cell.y + (cell.height * (0.25 + (row * 0.22)));
            ctx.beginPath();
            for (let step = 0; step <= 6; step++) {
                const t = step / 6;
                const x = cell.x + (t * cell.width);
                const wave = Math.sin((t * Math.PI * 2) + (seed * 0.001) + row) * (cell.height * 0.04);
                step === 0 ? ctx.moveTo(x, y + wave) : ctx.lineTo(x, y + wave);
            }
            ctx.stroke();
        }
    }

    private drawDunePattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        ctx.strokeStyle = this.colorUtils.withAlpha(theme.ui.primaryAccent, 0.1 * brightness);
        for (let row = 0; row < 3; row++) {
            const y = cell.y + (cell.height * (0.28 + (row * 0.2)));
            ctx.beginPath();
            ctx.moveTo(cell.x + 4, y);
            ctx.quadraticCurveTo(cell.x + (cell.width * 0.35), y - 3, cell.x + (cell.width * 0.65), y + 2);
            ctx.quadraticCurveTo(cell.x + (cell.width * 0.82), y + 5, cell.x + cell.width - 4, y + 1);
            ctx.stroke();
        }
    }

    private drawGrovesPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number, seed: number): void {
        ctx.fillStyle = this.colorUtils.withAlpha(theme.ui.panelHighlight, 0.14 * brightness);
        for (let index = 0; index < 4; index++) {
            const offsetX = this.colorUtils.seededRandom(seed + index) * (cell.width - 10);
            const offsetY = this.colorUtils.seededRandom(seed + (index * 13)) * (cell.height - 10);
            ctx.beginPath();
            ctx.arc(cell.x + 5 + offsetX, cell.y + 5 + offsetY, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawRidgesPattern(ctx: CanvasRenderingContext2D, cell: GridCell, brightness: number): void {
        ctx.strokeStyle = this.colorUtils.withAlpha(theme.ui.primaryAccent, 0.16 * brightness);
        for (let index = 0; index < 3; index++) {
            const startX = cell.x + 4 + (index * (cell.width / 4));
            ctx.beginPath();
            ctx.moveTo(startX, cell.y + cell.height - 4);
            ctx.lineTo(startX + (cell.width * 0.14), cell.y + 4);
            ctx.stroke();
        }
    }

    private drawMountain(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        const scale = size / 40;
        ctx.beginPath();
        ctx.moveTo(x - (7 * scale), y + (6 * scale));
        ctx.lineTo(x, y - (8 * scale));
        ctx.lineTo(x + (7 * scale), y + (6 * scale));
        ctx.closePath();
        ctx.fill();
    }

    private drawForest(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        const scale = size / 40;
        ctx.beginPath();
        ctx.arc(x, y - (1 * scale), 6 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - (1.2 * scale), y + (4 * scale), 2.4 * scale, 5 * scale);
    }

    private drawWater(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        const scale = size / 40;
        ctx.fillRect(x - (7 * scale), y - (1 * scale), 14 * scale, 2 * scale);
        ctx.fillRect(x - (5 * scale), y + (3 * scale), 10 * scale, 2 * scale);
    }

    private drawDesert(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
        const scale = size / 40;
        ctx.beginPath();
        ctx.arc(x - (3 * scale), y + (1 * scale), 4 * scale, Math.PI, Math.PI * 2);
        ctx.arc(x + (3 * scale), y + (1 * scale), 4 * scale, Math.PI, Math.PI * 2);
        ctx.fill();
    }
}
