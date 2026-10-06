import GridMap from '../../utils/GridMap.js';
import { CombatEntity, Direction, GridPosition, SelectedBattleCellInfo, TerrainType } from '../../types/game.js';
import { theme } from '../../config/ThemeConfig.js';
import BattleMapView, { BattleObstacle } from './BattleMapView.js';
import BattleMapNavigation from './BattleMapNavigation.js';
import BattleMapObstacleGenerator from './BattleMapObstacleGenerator.js';
import BattleMapSelectionInfo from './map/BattleMapSelectionInfo.js';

export default class BattleMap {
    private readonly grid: GridMap;
    private readonly view: BattleMapView;
    private readonly navigation: BattleMapNavigation;
    private readonly obstacleGenerator: BattleMapObstacleGenerator;
    private entities: CombatEntity[];
    private terrainType: TerrainType;
    private obstacles: Map<string, BattleObstacle>;
    private selectedGridPos: GridPosition | null;

    constructor() {
        this.grid = new GridMap(theme.battleMap.gridSize.columns, theme.battleMap.gridSize.rows, 48);
        this.terrainType = 'grass';
        this.obstacles = new Map();
        this.selectedGridPos = null;
        this.entities = [];
        this.view = new BattleMapView(this.grid, () => this.terrainType, () => this.getObstacles());
        this.navigation = new BattleMapNavigation(this.grid, () => this.obstacles, () => this.entities);
        this.obstacleGenerator = new BattleMapObstacleGenerator(this.grid);
    }

    public setup(player: CombatEntity, enemies: CombatEntity[], terrainType: TerrainType = 'grass', allies: CombatEntity[] = []): void {
        this.entities = [];
        this.terrainType = terrainType;
        const playerSpawn = this.getPlayerSpawnPosition();
        const enemySpawns = this.getEnemySpawnPositions(enemies.length);
        const allySpawns = this.getAllySpawnPositions(allies.length, playerSpawn);
        this.obstacles = this.obstacleGenerator.generate(terrainType, playerSpawn, enemySpawns);
        this.placeEntity(player, playerSpawn.col, playerSpawn.row);
        allies.forEach((ally, index) => this.placeEntity(ally, allySpawns[index].col, allySpawns[index].row));
        enemies.forEach((enemy, index) => this.placeEntity(enemy, enemySpawns[index].col, enemySpawns[index].row));
    }

    public isInMeleeRange(attacker: CombatEntity, target: CombatEntity): boolean {
        const source = this.navigation.getEntityGridPosition(attacker);
        const destination = this.navigation.getEntityGridPosition(target);
        return this.grid.areAdjacent(source.col, source.row, destination.col, destination.row);
    }

    public isInAttackRange(attacker: CombatEntity, target: CombatEntity, range: number): boolean {
        const source = this.navigation.getEntityGridPosition(attacker);
        const destination = this.navigation.getEntityGridPosition(target);
        const distance = this.navigation.getPathDistance(source, destination, { ignoreEntity: attacker, allowDestinationOccupied: true });
        return distance !== null && distance <= range;
    }

    public moveEntityToward(entity: CombatEntity, targetEntity: CombatEntity, desiredRange: number = 1): boolean {
        const source = this.navigation.getEntityGridPosition(entity);
        const target = this.navigation.getEntityGridPosition(targetEntity);
        const nextStep = this.navigation.findNextStepTowardRange(source, target, entity, desiredRange);
        if (!nextStep) {
            return false;
        }
        return this.tryMove(entity, nextStep.col, nextStep.row);
    }

    public moveEntity(entity: CombatEntity, direction: Direction): boolean {
        const source = this.navigation.getEntityGridPosition(entity);
        const next = this.navigation.getDirectionalStep(source, direction);
        return this.tryMove(entity, next.col, next.row);
    }

    public resizeToCanvas(canvasWidth: number, canvasHeight: number): void {
        const { columns, rows } = this.grid.getDimensions();
        const nextCellSize = Math.max(1, Math.floor(Math.min(canvasWidth / columns, canvasHeight / rows)));
        const mapWidth = columns * nextCellSize;
        const mapHeight = rows * nextCellSize;
        const offsetX = Math.floor((canvasWidth - mapWidth) / 2);
        const offsetY = Math.floor((canvasHeight - mapHeight) / 2);
        this.grid.updateLayout(nextCellSize, offsetX, offsetY);
        this.entities.forEach((entity) => this.syncEntityPixelPosition(entity));
    }

    public draw(ctx: CanvasRenderingContext2D, _renderer: unknown, currentEntity: CombatEntity | null = null, selectedEnemy: CombatEntity | null = null): void {
        this.view.draw(ctx, currentEntity, selectedEnemy, this.selectedGridPos);
    }

    public updateSelectedCellFromPixel(pixelX: number, pixelY: number): boolean {
        const [col, row] = this.grid.pixelToGrid(pixelX, pixelY);
        if (!this.grid.isValidPosition(col, row)) {
            this.selectedGridPos = null;
            return false;
        }
        this.selectedGridPos = { col, row };
        return true;
    }

    public clearSelectedCell = (): void => {
        this.selectedGridPos = null;
    };

    public getSelectedCellInfo = (): SelectedBattleCellInfo | null => BattleMapSelectionInfo.build(this.selectedGridPos, this.entities, this.obstacles, this.terrainType);

    public isEntityOnEdge(entity: CombatEntity): boolean {
        const col = entity.gridCol;
        const row = entity.gridRow;
        if (col === undefined || row === undefined) {
            return false;
        }
        const lastCol = this.grid.columns - 1;
        const lastRow = this.grid.rows - 1;
        return col === 0 || col === lastCol || row === 0 || row === lastRow;
    }

    public isObstacle = (col: number, row: number): boolean => this.obstacles.has(this.getCellKey(col, row));

    public getObstacles = (): BattleObstacle[] => Array.from(this.obstacles.values());

    private getPlayerSpawnPosition = (): GridPosition => ({ col: Math.floor(this.grid.columns / 2), row: this.grid.rows - 2 });

    private getEnemySpawnPositions(enemyCount: number): GridPosition[] {
        const clampedCount = Math.max(1, enemyCount);
        const spacing = 2;
        const formationWidth = Math.max(1, ((clampedCount - 1) * spacing) + 1);
        const startCol = Math.max(1, Math.floor((this.grid.columns - formationWidth) / 2));
        return Array.from({ length: clampedCount }, (_, index) => ({ col: Math.min(this.grid.columns - 2, startCol + (index * spacing)), row: 1 }));
    }

    private getAllySpawnPositions(allyCount: number, playerSpawn: GridPosition): GridPosition[] {
        const clampedCount = Math.max(0, allyCount);
        if (clampedCount === 0) {
            return [];
        }
        const positions: GridPosition[] = [];
        for (let index = 0; index < clampedCount; index += 1) {
            const colOffset = (index % 2 === 0 ? -1 : 1) * (Math.floor(index / 2) + 1);
            const col = Math.max(1, Math.min(this.grid.columns - 2, playerSpawn.col + colOffset));
            const row = Math.max(1, Math.min(this.grid.rows - 2, playerSpawn.row - 1));
            positions.push({ col, row });
        }
        return positions;
    }

    private placeEntity(entity: CombatEntity, col: number, row: number): void {
        entity.gridCol = col;
        entity.gridRow = row;
        this.syncEntityPixelPosition(entity);
        this.entities.push(entity);
    }

    private syncEntityPixelPosition(entity: CombatEntity): void {
        if (entity.gridCol === undefined || entity.gridRow === undefined) {
            return;
        }
        const [x, y] = this.grid.gridToPixel(entity.gridCol, entity.gridRow);
        entity.x = x;
        entity.y = y;
    }

    private tryMove(entity: CombatEntity, col: number, row: number): boolean {
        if (!this.grid.isValidPosition(col, row)) {
            return false;
        }
        if (this.isObstacle(col, row) || this.navigation.isOccupiedByLivingEntity(entity, col, row)) {
            return false;
        }
        entity.gridCol = col;
        entity.gridRow = row;
        this.syncEntityPixelPosition(entity);
        return true;
    }

    private getCellKey = (col: number, row: number): string => `${col},${row}`;
}
