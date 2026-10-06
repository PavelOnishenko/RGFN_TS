import GridMap from '../../utils/GridMap.js';
import { GridCell, TerrainType } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import { BattleMapPainterUtils } from './map/BattleMapPainterUtils.js';
import { BattleTerrainPainter } from './BattleTerrainPainter.js';

export type BattleObstacleKind = 'tree' | 'bush' | 'stump' | 'rock' | 'pillar' | 'cactus' | 'bones' | 'reed' | 'stone' | 'driftwood';

export type BattleObstacle = {
    col: number;
    row: number;
    kind: BattleObstacleKind;
};

export class BattleObstaclePainter {
    private readonly grid: GridMap;
    private readonly terrainPainter: BattleTerrainPainter;

    constructor(grid: GridMap, terrainPainter: BattleTerrainPainter) {
        this.grid = grid;
        this.terrainPainter = terrainPainter;
    }

    public drawObstacles(ctx: CanvasRenderingContext2D, terrainType: TerrainType, obstacles: BattleObstacle[]): void {
        obstacles.forEach((obstacle) => {
            const cell = this.grid.getCellAt(obstacle.col, obstacle.row);
            if (!cell) {
                return;
            }
            ctx.save();
            ctx.shadowColor = theme.battleMap.obstacleShadow;
            ctx.shadowBlur = 5;
            ctx.shadowOffsetY = 2;
            this.drawObstacle(ctx, cell, obstacle.kind, terrainType);
            ctx.restore();
        });
    }

    private drawObstacle(ctx: CanvasRenderingContext2D, cell: GridCell, kind: BattleObstacleKind, terrainType: TerrainType): void {
        const centerX = cell.x + (cell.width / 2);
        const centerY = cell.y + (cell.height / 2);
        const size = cell.width / 2;
        const accent = this.terrainPainter.getObstacleAccent(terrainType);
        ctx.fillStyle = theme.battleMap.obstacleFill;
        ctx.strokeStyle = theme.battleMap.obstacleEdge;
        ctx.lineWidth = 1.5;
        if (kind === 'tree') {
            this.drawTree(ctx, centerX, centerY, size, accent);
            return;
        }
        if (kind === 'bush' || kind === 'reed') {
            this.drawBush(ctx, centerX, centerY, size, accent);
            return;
        }
        if (kind === 'stump' || kind === 'driftwood') {
            this.drawStump(ctx, centerX, centerY, size);
            return;
        }
        if (kind === 'rock' || kind === 'stone') {
            this.drawRock(ctx, centerX, centerY, size, accent);
            return;
        }
        if (kind === 'pillar') {
            this.drawPillar(ctx, centerX, centerY, size, accent);
            return;
        }
        if (kind === 'cactus') {
            this.drawCactus(ctx, centerX, centerY, size, accent);
            return;
        }
        if (kind === 'bones') {
            this.drawBones(ctx, centerX, centerY, size, accent);
        }
    }

    private drawTree(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, accent: string): void {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(centerX, centerY - (size * 0.2), size * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.battleMap.obstacleFill;
        ctx.fillRect(centerX - (size * 0.1), centerY + (size * 0.15), size * 0.2, size * 0.38);
    }

    private drawBush(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, accent: string): void {
        ctx.fillStyle = accent;
        for (let index = 0; index < 3; index++) {
            ctx.beginPath();
            ctx.arc(centerX - (size * 0.22) + (index * size * 0.22), centerY + (index % 2 === 0 ? 0 : -2), size * 0.22, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawStump(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number): void {
        ctx.fillStyle = theme.battleMap.obstacleFill;
        const stumpPath = BattleMapPainterUtils.createRoundedRectPath(centerX - (size * 0.4), centerY - (size * 0.18), size * 0.8, size * 0.38, 6);
        ctx.fill(stumpPath);
        ctx.stroke(stumpPath);
    }

    private drawRock(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, accent: string): void {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(centerX - (size * 0.4), centerY + (size * 0.24));
        ctx.lineTo(centerX - (size * 0.14), centerY - (size * 0.4));
        ctx.lineTo(centerX + (size * 0.38), centerY - (size * 0.1));
        ctx.lineTo(centerX + (size * 0.24), centerY + (size * 0.36));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    private drawPillar(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, accent: string): void {
        ctx.fillStyle = accent;
        const pillarPath = BattleMapPainterUtils.createRoundedRectPath(centerX - (size * 0.2), centerY - (size * 0.44), size * 0.4, size * 0.88, 8);
        ctx.fill(pillarPath);
        ctx.stroke(pillarPath);
    }

    private drawCactus(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, accent: string): void {
        ctx.fillStyle = accent;
        ctx.fillRect(centerX - (size * 0.12), centerY - (size * 0.44), size * 0.24, size * 0.88);
        ctx.fillRect(centerX - (size * 0.32), centerY - (size * 0.12), size * 0.18, size * 0.18);
        ctx.fillRect(centerX + (size * 0.14), centerY - (size * 0.26), size * 0.18, size * 0.18);
    }

    private drawBones(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, accent: string): void {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - (size * 0.36), centerY - (size * 0.26));
        ctx.lineTo(centerX + (size * 0.36), centerY + (size * 0.26));
        ctx.moveTo(centerX + (size * 0.36), centerY - (size * 0.26));
        ctx.lineTo(centerX - (size * 0.36), centerY + (size * 0.26));
        ctx.stroke();
    }
}
