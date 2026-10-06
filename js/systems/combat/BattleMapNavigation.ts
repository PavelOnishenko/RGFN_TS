import GridMap from '../../utils/GridMap.js';
import { CombatEntity, Direction, GridPosition } from '../../types/game.js';
import { BattleObstacle } from './BattleMapView.js';

const CARDINAL_STEPS: GridPosition[] = [{ col: 1, row: 0 }, { col: -1, row: 0 }, { col: 0, row: 1 }, { col: 0, row: -1 }];

type PathOptions = {
    ignoreEntity?: CombatEntity | null;
    allowDestinationOccupied?: boolean;
};
type CandidateTarget = { goal: GridPosition; path: GridPosition[] };

export default class BattleMapNavigation {
    private readonly grid: GridMap;
    private readonly obstaclesProvider: () => Map<string, BattleObstacle>;
    private readonly entitiesProvider: () => CombatEntity[];

    constructor(grid: GridMap, obstaclesProvider: () => Map<string, BattleObstacle>, entitiesProvider: () => CombatEntity[]) {
        this.grid = grid;
        this.obstaclesProvider = obstaclesProvider;
        this.entitiesProvider = entitiesProvider;
    }

    public getEntityGridPosition = (entity: CombatEntity): GridPosition => ({ col: entity.gridCol ?? 0, row: entity.gridRow ?? 0 });

    public getDirectionalStep(source: GridPosition, direction: Direction): GridPosition {
        if (direction === 'up') {
            return { col: source.col, row: source.row - 1 };
        }
        if (direction === 'down') {
            return { col: source.col, row: source.row + 1 };
        }
        if (direction === 'left') {
            return { col: source.col - 1, row: source.row };
        }
        return { col: source.col + 1, row: source.row };
    }

    public findNextStepTowardRange(source: GridPosition, target: GridPosition, entity: CombatEntity, desiredRange: number): GridPosition | null {
        const candidateTargets: CandidateTarget[] = [];
        this.collectCandidateTargets(candidateTargets, source, target, entity, desiredRange);
        const bestTarget = this.pickBestCandidateTarget(candidateTargets, target);
        return bestTarget?.path[1] ?? null;
    }

    private collectCandidateTargets(candidateTargets: CandidateTarget[], source: GridPosition, target: GridPosition, entity: CombatEntity, desiredRange: number): void {
        this.grid.forEachCell((_cell, col, row) => this.tryAddCandidateTarget(candidateTargets, source, target, entity, desiredRange, col, row));
    }

    private tryAddCandidateTarget(
        candidateTargets: CandidateTarget[],
        source: GridPosition,
        target: GridPosition,
        entity: CombatEntity,
        desiredRange: number,
        col: number,
        row: number,
    ): void {
        if (this.isObstacle(col, row) || this.isBeyondDesiredRange(target, desiredRange, col, row)) {
            return;
        }
        if ((col !== source.col || row !== source.row) && this.isOccupiedByLivingEntity(entity, col, row)) {
            return;
        }
        const path = this.findPath(source, { col, row }, { ignoreEntity: entity, allowDestinationOccupied: false });
        if (path && path.length > 1) {
            candidateTargets.push({ goal: { col, row }, path });
        }
    }

    private isBeyondDesiredRange = (target: GridPosition, desiredRange: number, col: number, row: number): boolean =>
        Math.abs(target.col - col) + Math.abs(target.row - row) > desiredRange;

    private pickBestCandidateTarget(candidateTargets: CandidateTarget[], target: GridPosition): CandidateTarget | null {
        if (candidateTargets.length === 0) {
            return null;
        }

        candidateTargets.sort((left, right) => {
            if (left.path.length !== right.path.length) {
                return left.path.length - right.path.length;
            }
            const leftDistance = Math.abs(left.goal.col - target.col) + Math.abs(left.goal.row - target.row);
            const rightDistance = Math.abs(right.goal.col - target.col) + Math.abs(right.goal.row - target.row);
            return leftDistance - rightDistance;
        });
        return candidateTargets[0] ?? null;
    }

    public getPathDistance(start: GridPosition, end: GridPosition, options: PathOptions): number | null {
        const path = this.findPath(start, end, options);
        return path ? path.length - 1 : null;
    }

    private findPath(start: GridPosition, end: GridPosition, options: PathOptions = {}): GridPosition[] | null {
        if (!this.grid.isValidPosition(start.col, start.row) || !this.grid.isValidPosition(end.col, end.row)) {
            return null;
        }

        const queue: GridPosition[] = [start];
        const visited = new Set<string>([this.getCellKey(start.col, start.row)]);
        const cameFrom = new Map<string, string | null>();
        cameFrom.set(this.getCellKey(start.col, start.row), null);

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.col === end.col && current.row === end.row) {
                return this.reconstructPath(cameFrom, current);
            }
            this.expandPathFrontier(current, end, options, visited, cameFrom, queue);
        }

        return null;
    }

    private expandPathFrontier(
        current: GridPosition, end: GridPosition, options: PathOptions, visited: Set<string>, cameFrom: Map<string, string | null>, queue: GridPosition[],
    ): void {
        CARDINAL_STEPS.forEach((step) => {
            const nextCol = current.col + step.col;
            const nextRow = current.row + step.row;
            const nextKey = this.getCellKey(nextCol, nextRow);
            if (visited.has(nextKey) || !this.grid.isValidPosition(nextCol, nextRow) || this.isBlockedPathCell(nextCol, nextRow, end, options)) {
                return;
            }
            visited.add(nextKey);
            cameFrom.set(nextKey, this.getCellKey(current.col, current.row));
            queue.push({ col: nextCol, row: nextRow });
        });
    }

    private isBlockedPathCell(nextCol: number, nextRow: number, end: GridPosition, options: PathOptions): boolean {
        const destinationCell = nextCol === end.col && nextRow === end.row;
        const blockedByEntity = this.entitiesProvider().some((candidate) => {
            if (candidate === options.ignoreEntity || candidate.isDead() || (options.allowDestinationOccupied && destinationCell)) {
                return false;
            }
            return candidate.gridCol === nextCol && candidate.gridRow === nextRow;
        });
        return this.isObstacle(nextCol, nextRow) || blockedByEntity;
    }

    private reconstructPath(cameFrom: Map<string, string | null>, end: GridPosition): GridPosition[] {
        const path: GridPosition[] = [];
        let currentKey: string | null = this.getCellKey(end.col, end.row);
        while (currentKey) {
            const [colText, rowText] = currentKey.split(',');
            path.push({ col: Number(colText), row: Number(rowText) });
            currentKey = cameFrom.get(currentKey) ?? null;
        }
        return path.reverse();
    }

    public isOccupiedByLivingEntity = (entity: CombatEntity, col: number, row: number): boolean => this.entitiesProvider().some((currentEntity) => {
        const isSameEntity = currentEntity === entity;
        const sharesGridPosition = currentEntity.gridCol === col && currentEntity.gridRow === row;
        return !isSameEntity && sharesGridPosition && !currentEntity.isDead();
    });

    private isObstacle = (col: number, row: number): boolean => this.obstaclesProvider().has(this.getCellKey(col, row));

    private getCellKey = (col: number, row: number): string => `${col},${row}`;
}
