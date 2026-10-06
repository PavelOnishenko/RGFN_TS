import GridMap from '../../utils/GridMap.js';
import { CombatEntity, GridCell, GridPosition, TerrainType } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import { BattleObstacle, BattleObstacleKind, BattleObstaclePainter } from './BattleObstaclePainter.js';
import { BattleTerrainPainter } from './BattleTerrainPainter.js';
import { BattleMapPainterUtils } from './map/BattleMapPainterUtils.js';

export type { BattleObstacle, BattleObstacleKind };

export default class BattleMapView {
    private readonly grid: GridMap;
    private readonly terrainProvider: () => TerrainType;
    private readonly obstacleProvider: () => BattleObstacle[];
    private readonly terrainPainter: BattleTerrainPainter;
    private readonly obstaclePainter: BattleObstaclePainter;

    constructor(grid: GridMap, terrainProvider: () => TerrainType, obstacleProvider: () => BattleObstacle[]) {
        this.grid = grid;
        this.terrainProvider = terrainProvider;
        this.obstacleProvider = obstacleProvider;
        this.terrainPainter = new BattleTerrainPainter();
        this.obstaclePainter = new BattleObstaclePainter(grid, this.terrainPainter);
    }

    public draw(
        ctx: CanvasRenderingContext2D,
        currentEntity: CombatEntity | null = null,
        selectedEnemy: CombatEntity | null = null,
        selectedCell: GridPosition | null = null,
    ): void {
        const dimensions = this.grid.getDimensions();
        ctx.fillStyle = theme.battleMap.background;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        const terrainType = this.terrainProvider();
        this.grid.forEachCell((cell, col, row) => this.drawCell(ctx, cell, col, row, terrainType, currentEntity, selectedEnemy, selectedCell));
        this.obstaclePainter.drawObstacles(ctx, terrainType, this.obstacleProvider());
    }

    private drawCell(
        ctx: CanvasRenderingContext2D,
        cell: GridCell,
        col: number,
        row: number,
        terrainType: TerrainType,
        currentEntity: CombatEntity | null,
        selectedEnemy: CombatEntity | null,
        selectedCell: GridPosition | null,
    ): void {
        this.drawBaseTile(ctx, cell, col, row, terrainType);
        this.drawCurrentEntityHighlight(ctx, cell, col, row, currentEntity);
        this.drawSelectedEnemyHighlight(ctx, cell, col, row, selectedEnemy);
        this.drawSelectedCellHighlight(ctx, cell, col, row, selectedCell);
        this.drawBorder(ctx, cell);
        this.drawSelectedCellBorder(ctx, cell, col, row, selectedCell);
        this.drawSelectedEnemyBorder(ctx, cell, col, row, selectedEnemy);
    }

    private drawBaseTile(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, terrainType: TerrainType): void {
        const palette = this.terrainPainter.getTerrainPalette(terrainType, (col + row) % 2 === 0);
        const path = BattleMapPainterUtils.createRoundedRectPath(cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2, Math.max(4, cell.width * 0.14));
        const gradient = ctx.createLinearGradient(cell.x, cell.y, cell.x + cell.width, cell.y + cell.height);
        gradient.addColorStop(0, palette.base);
        gradient.addColorStop(1, palette.shade);
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fill(path);
        ctx.clip(path);
        this.terrainPainter.drawTerrainSet(ctx, cell, terrainType, palette.detail, col, row);
        ctx.restore();
    }

    private drawCurrentEntityHighlight(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, currentEntity: CombatEntity | null): void {
        if (!this.isEntityAtCell(currentEntity, col, row)) {
            return;
        }
        const isPlayer = currentEntity?.constructor.name === 'Player';
        const path = BattleMapPainterUtils.createRoundedRectPath(cell.x + 4, cell.y + 4, cell.width - 8, cell.height - 8, Math.max(4, cell.width * 0.12));
        ctx.fillStyle = isPlayer ? theme.battleMap.currentEntityPlayer : theme.battleMap.currentEntityEnemy;
        ctx.fill(path);
    }

    private drawSelectedEnemyHighlight(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, selectedEnemy: CombatEntity | null): void {
        if (!this.isEntityAtCell(selectedEnemy, col, row)) {
            return;
        }
        const path = BattleMapPainterUtils.createRoundedRectPath(cell.x + 6, cell.y + 6, cell.width - 12, cell.height - 12, Math.max(4, cell.width * 0.1));
        ctx.fillStyle = theme.battleMap.selectedEnemy;
        ctx.fill(path);
    }

    private drawBorder(ctx: CanvasRenderingContext2D, cell: GridCell): void {
        ctx.strokeStyle = theme.battleMap.gridBorders;
        ctx.lineWidth = 1.5;
        ctx.stroke(BattleMapPainterUtils.createRoundedRectPath(cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2, Math.max(4, cell.width * 0.14)));
    }

    private drawSelectedEnemyBorder(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, selectedEnemy: CombatEntity | null): void {
        if (!this.isEntityAtCell(selectedEnemy, col, row)) {
            return;
        }
        ctx.strokeStyle = theme.ui.enemyColor;
        ctx.lineWidth = 3;
        ctx.stroke(BattleMapPainterUtils.createRoundedRectPath(cell.x + 4, cell.y + 4, cell.width - 8, cell.height - 8, Math.max(4, cell.width * 0.12)));
    }

    private drawSelectedCellHighlight(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, selectedCell: GridPosition | null): void {
        if (!selectedCell || selectedCell.col !== col || selectedCell.row !== row) {
            return;
        }
        const path = BattleMapPainterUtils.createRoundedRectPath(cell.x + 8, cell.y + 8, cell.width - 16, cell.height - 16, Math.max(4, cell.width * 0.08));
        ctx.fillStyle = 'rgba(120, 180, 255, 0.24)';
        ctx.fill(path);
    }

    private drawSelectedCellBorder(ctx: CanvasRenderingContext2D, cell: GridCell, col: number, row: number, selectedCell: GridPosition | null): void {
        if (!selectedCell || selectedCell.col !== col || selectedCell.row !== row) {
            return;
        }
        ctx.strokeStyle = theme.ui.primaryAccent;
        ctx.lineWidth = 2;
        ctx.stroke(BattleMapPainterUtils.createRoundedRectPath(cell.x + 3, cell.y + 3, cell.width - 6, cell.height - 6, Math.max(4, cell.width * 0.12)));
    }

    private isEntityAtCell = (entity: CombatEntity | null, col: number, row: number): boolean => entity !== null && entity.gridCol === col && entity.gridRow === row;
}
