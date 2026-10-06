import GridMap from '../../utils/GridMap.js';
import { GridPosition, TerrainType } from '../../types/game.js';
import { BattleObstacle, BattleObstacleKind } from './BattleMapView.js';

const CARDINAL_STEPS: GridPosition[] = [{ col: 1, row: 0 }, { col: -1, row: 0 }, { col: 0, row: 1 }, { col: 0, row: -1 }];

type TerrainObstacleProfile = {
    min: number;
    max: number;
    kinds: BattleObstacleKind[];
};

export default class BattleMapObstacleGenerator {
    private readonly grid: GridMap;
    private obstacles: Map<string, BattleObstacle>;

    constructor(grid: GridMap) {
        this.grid = grid;
        this.obstacles = new Map();
    }

    public generate(terrainType: TerrainType, playerSpawn: GridPosition, enemySpawns: GridPosition[]): Map<string, BattleObstacle> {
        this.obstacles.clear();
        const profile = this.getObstacleProfile(terrainType);
        const reserved = this.buildReservedCells(playerSpawn, enemySpawns);
        const candidates = this.getObstacleCandidates(reserved);
        const targetCount = Math.min(candidates.length, this.randomInt(profile.min, profile.max));

        for (const candidate of this.shuffle(candidates)) {
            if (this.obstacles.size >= targetCount) {
                break;
            }

            const key = this.getCellKey(candidate.col, candidate.row);
            if (reserved.has(key) || this.countAdjacentObstacles(candidate.col, candidate.row) > 1) {
                continue;
            }

            const kind = profile.kinds[this.randomInt(0, profile.kinds.length - 1)];
            this.obstacles.set(key, { col: candidate.col, row: candidate.row, kind });

            if (!this.isWalkableArenaConnected() || !this.allEnemiesHaveMeleeLane(playerSpawn, enemySpawns)) {
                this.obstacles.delete(key);
            }
        }

        return new Map(this.obstacles);
    }

    private getObstacleProfile(terrainType: TerrainType): TerrainObstacleProfile {
        if (terrainType === 'forest') {
            return { min: 14, max: 24, kinds: ['tree', 'bush', 'stump'] };
        }
        if (terrainType === 'mountain') {
            return { min: 12, max: 20, kinds: ['rock', 'pillar'] };
        }
        if (terrainType === 'desert') {
            return { min: 8, max: 15, kinds: ['cactus', 'rock', 'bones'] };
        }
        if (terrainType === 'water') {
            return { min: 10, max: 18, kinds: ['reed', 'stone', 'driftwood'] };
        }
        return { min: 9, max: 16, kinds: ['bush', 'rock', 'stump'] };
    }

    private buildReservedCells(playerSpawn: GridPosition, enemySpawns: GridPosition[]): Set<string> {
        const reserved = new Set<string>();
        const centerCol = Math.floor(this.grid.columns / 2);

        for (let row = 0; row < this.grid.rows; row++) {
            for (let delta = -1; delta <= 1; delta++) {
                const col = centerCol + delta;
                if (this.grid.isValidPosition(col, row)) {
                    reserved.add(this.getCellKey(col, row));
                }
            }
        }

        reserved.add(this.getCellKey(playerSpawn.col, playerSpawn.row));
        enemySpawns.forEach((spawn) => {
            reserved.add(this.getCellKey(spawn.col, spawn.row));
            CARDINAL_STEPS.forEach((step) => {
                const nextCol = spawn.col + step.col;
                const nextRow = spawn.row + step.row;
                if (this.grid.isValidPosition(nextCol, nextRow)) {
                    reserved.add(this.getCellKey(nextCol, nextRow));
                }
            });
        });

        return reserved;
    }

    private getObstacleCandidates(reserved: Set<string>): GridPosition[] {
        const candidates: GridPosition[] = [];
        for (let row = 1; row < this.grid.rows - 1; row++) {
            for (let col = 1; col < this.grid.columns - 1; col++) {
                const key = this.getCellKey(col, row);
                if (!reserved.has(key)) {
                    candidates.push({ col, row });
                }
            }
        }
        return candidates;
    }

    private allEnemiesHaveMeleeLane = (playerSpawn: GridPosition, enemySpawns: GridPosition[]): boolean => enemySpawns.every((spawn) => CARDINAL_STEPS
        .map((step) => ({ col: spawn.col + step.col, row: spawn.row + step.row }))
        .filter((candidate) => this.grid.isValidPosition(candidate.col, candidate.row) && !this.isObstacle(candidate.col, candidate.row))
        .some((candidate) => this.pathExists(playerSpawn, candidate)));

    private pathExists(start: GridPosition, end: GridPosition): boolean {
        const queue: GridPosition[] = [start];
        const visited = new Set<string>([this.getCellKey(start.col, start.row)]);
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.col === end.col && current.row === end.row) {
                return true;
            }

            CARDINAL_STEPS.forEach((step) => {
                const col = current.col + step.col;
                const row = current.row + step.row;
                const key = this.getCellKey(col, row);
                if (!this.grid.isValidPosition(col, row) || this.isObstacle(col, row) || visited.has(key)) {
                    return;
                }
                visited.add(key);
                queue.push({ col, row });
            });
        }

        return false;
    }

    private isWalkableArenaConnected(): boolean {
        const walkableCells: GridPosition[] = [];
        this.grid.forEachCell((_cell, col, row) => {
            if (!this.isObstacle(col, row)) {
                walkableCells.push({ col, row });
            }
        });

        if (walkableCells.length === 0) {
            return true;
        }

        const queue: GridPosition[] = [walkableCells[0]];
        const visited = new Set<string>();
        while (queue.length > 0) {
            const current = queue.shift()!;
            const key = this.getCellKey(current.col, current.row);
            if (visited.has(key)) {
                continue;
            }
            visited.add(key);

            CARDINAL_STEPS.forEach((step) => {
                const col = current.col + step.col;
                const row = current.row + step.row;
                const nextKey = this.getCellKey(col, row);
                if (!this.grid.isValidPosition(col, row) || this.isObstacle(col, row) || visited.has(nextKey)) {
                    return;
                }
                queue.push({ col, row });
            });
        }

        return visited.size === walkableCells.length;
    }

    private countAdjacentObstacles = (col: number, row: number): number =>
        CARDINAL_STEPS.reduce((count, step) => count + (this.isObstacle(col + step.col, row + step.row) ? 1 : 0), 0);

    private isObstacle = (col: number, row: number): boolean => this.obstacles.has(this.getCellKey(col, row));

    private getCellKey = (col: number, row: number): string => `${col},${row}`;

    private randomInt = (min: number, max: number): number => Math.floor(Math.random() * ((max - min) + 1)) + min;

    private shuffle<T>(items: T[]): T[] {
        const result = [...items];
        for (let index = result.length - 1; index > 0; index--) {
            const target = this.randomInt(0, index);
            const current = result[index];
            result[index] = result[target];
            result[target] = current;
        }
        return result;
    }
}
