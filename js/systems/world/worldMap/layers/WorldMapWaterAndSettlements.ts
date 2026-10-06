// @ts-nocheck
import WorldMapTerrainModeling from '../WorldMapTerrainModeling.js';
import { theme } from '../../../../config/ThemeConfig.js';
import { balanceConfig } from '../../../../config/balance/balanceConfig.js';
export default class WorldMapWaterAndSettlements extends WorldMapTerrainModeling {
    private generateRiverCells(climateByKey: Map<string, ClimateCell>, columns: number, rows: number): Set<string> {
        const riverConfig = balanceConfig.worldMap.rivers ?? { count: 5, maxLengthFactor: 0.72, turnRate: 0.34, width: 1 };
        const riverCells = new Set<string>();
        const sourceCandidates = Array.from(climateByKey.values())
            .filter((climate) => climate.elevation >= 0.7)
            .sort((left, right) => right.elevation - left.elevation);

        const riverCount = Math.min(riverConfig.count ?? 0, sourceCandidates.length);
        const maxLength = Math.max(columns, rows) * (riverConfig.maxLengthFactor ?? 0.72);
        const turnRate = riverConfig.turnRate ?? 0.34;
        const riverWidth = Math.max(1, Math.floor(riverConfig.width ?? 1));
        const usedSources = new Set<string>();

        for (let riverIndex = 0; riverIndex < riverCount; riverIndex += 1) {
            const source = this.pickUnusedRiverSource(sourceCandidates, usedSources);
            if (!source) {
                break;
            }
            this.traceRiverFromSource(riverCells, source, climateByKey, { maxLength, turnRate, riverIndex, riverWidth, columns, rows });
        }

        return riverCells;
    }

    private pickUnusedRiverSource(candidates: ClimateCell[], usedSources: Set<string>): ClimateCell | null {
        const source = candidates.find((candidate) => !usedSources.has(this.getCellKey(candidate.col, candidate.row)));
        if (!source) {
            return null;
        }
        usedSources.add(this.getCellKey(source.col, source.row));
        return source;
    }

    private traceRiverFromSource(
        riverCells: Set<string>,
        source: ClimateCell,
        climateByKey: Map<string, ClimateCell>,
        options: { maxLength: number; turnRate: number; riverIndex: number; riverWidth: number; columns: number; rows: number },
    ): void {
        let current = { col: source.col, row: source.row };
        for (let step = 0; step < options.maxLength; step += 1) {
            this.addWaterBrush(riverCells, current.col, current.row, options.riverWidth);
            const next = this.pickNextRiverStep(current.col, current.row, climateByKey, options.turnRate, options.riverIndex, step);
            if (!next) {
                break;
            }
            current = next;
            if (this.shouldStopRiverAtPosition(current, climateByKey, options.columns, options.rows)) {
                this.addWaterBrush(riverCells, current.col, current.row, options.riverWidth + 1);
                break;
            }
        }
    }

    private shouldStopRiverAtPosition(current: GridPosition, climateByKey: Map<string, ClimateCell>, columns: number, rows: number): boolean {
        const climate = climateByKey.get(this.getCellKey(current.col, current.row));
        if (!climate) {
            return true;
        }
        return current.col <= 0 || current.row <= 0 || current.col >= columns - 1 || current.row >= rows - 1 || climate.elevation <= 0.34;
    }

    private pickNextRiverStep(
        col: number,
        row: number,
        climateByKey: Map<string, ClimateCell>,
        turnRate: number,
        riverIndex: number,
        step: number,
    ): GridPosition | null {
        const directions = [{ col: 0, row: 1 }, { col: -1, row: 1 }, { col: 1, row: 1 }, { col: -1, row: 0 }, { col: 1, row: 0 }, { col: 0, row: -1 }];

        const ranked = directions
            .map((direction, directionIndex) => {
                const nextCol = col + direction.col;
                const nextRow = row + direction.row;
                if (!this.grid.isValidPosition(nextCol, nextRow)) {
                    return null;
                }

                const climate = climateByKey.get(this.getCellKey(nextCol, nextRow));
                if (!climate) {
                    return null;
                }

                const randomTurn = this.seededValue(`river-turn-${riverIndex}`, (step * directions.length) + directionIndex);
                const downhillBias = (1 - climate.elevation) * 1.4;
                const moistureBias = climate.moisture * 0.32;
                const eastWestBias = Math.abs(direction.col) > 0 ? randomTurn * turnRate : (1 - turnRate);
                const score = downhillBias + moistureBias + eastWestBias;
                return { position: { col: nextCol, row: nextRow }, score };
            })
            .filter((entry): entry is { position: GridPosition; score: number } => entry !== null)
            .sort((left, right) => right.score - left.score);

        return ranked[0]?.position ?? null;
    }

    private addWaterBrush(cells: Set<string>, col: number, row: number, radius: number): void {
        for (let y = row - radius; y <= row + radius; y += 1) {
            for (let x = col - radius; x <= col + radius; x += 1) {
                if (!this.grid.isValidPosition(x, y)) {
                    continue;
                }

                const distance = Math.abs(x - col) + Math.abs(y - row);
                if (distance <= radius) {
                    cells.add(this.getCellKey(x, y));
                }
            }
        }
    }

    private getQuantileThreshold<T>(items: T[], selector: (item: T) => number, share: number): number {
        if (items.length === 0) {
            return Number.POSITIVE_INFINITY;
        }

        const sorted = items.map(selector).sort((left, right) => right - left);
        const clampedShare = this.clamp01(share);
        const targetIndex = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * clampedShare) - 1));
        return sorted[targetIndex] ?? Number.POSITIVE_INFINITY;
    }

    private pickRandomPlayerStart(): void {
        const dims = this.grid.getDimensions();
        const candidates: GridPosition[] = [];

        for (let row = 0; row < dims.rows; row += 1) {
            for (let col = 0; col < dims.columns; col += 1) {
                const terrain = this.getTerrain(col, row);
                if (terrain && terrain.type !== 'water' && terrain.type !== 'mountain' && !this.villages.has(this.getCellKey(col, row))) {
                    candidates.push({ col, row });
                }
            }
        }

        if (candidates.length === 0) {
            this.playerGridPos = { col: Math.floor(dims.columns / 2), row: Math.floor(dims.rows / 2) };
            return;
        }

        const candidateIndex = this.seededInt(candidates.length, this.seededValue('player-start', 0));
        this.playerGridPos = candidates[candidateIndex] ?? candidates[0];
    }

    private generateVillages(): void {
        const dims = this.grid.getDimensions();
        const villageCount = this.getVillageTargetCount(dims.columns, dims.rows);
        this.villages.clear();
        this.villageIndexSet.clear();
        this.clearLocationFeaturesById('village');

        for (let attempt = 0; this.villages.size < villageCount && attempt < dims.columns * dims.rows * 8; attempt += 1) {
            const col = this.seededInt(dims.columns, this.seededValue('village-col', attempt));
            const row = this.seededInt(dims.rows, this.seededValue('village-row', attempt));
            if (!this.isVillageTerrainCandidate(col, row)) {
                continue;
            }
            if (this.getNearestVillageDistance(col, row) < 6) {
                continue;
            }
            this.addVillage(col, row);
        }
    }

    private getVillageTargetCount(columns: number, rows: number): number {
        const baseVillageCount = Math.max(
            balanceConfig.worldMap.villages.minCount,
            Math.floor((columns * rows) * balanceConfig.worldMap.villages.densityPerCell),
        );
        return Math.max(1, Math.floor(baseVillageCount * (balanceConfig.worldMap.villages.creationRateMultiplier ?? 1)));
    }

    private isVillageTerrainCandidate(col: number, row: number): boolean {
        const terrain = this.getTerrain(col, row);
        return !!terrain && terrain.type !== 'water' && terrain.type !== 'mountain' && terrain.type !== 'desert';
    }

    private getNearestVillageDistance = (col: number, row: number): number => Array.from(this.villages).reduce((closest, key) => {
        const [vColText, vRowText] = key.split(',');
        const vCol = Number(vColText);
        const vRow = Number(vRowText);
        return Math.min(closest, Math.abs(vCol - col) + Math.abs(vRow - row));
    }, Number.POSITIVE_INFINITY);

    private addVillage(col: number, row: number): void {
        const key = this.getCellKey(col, row);
        this.villages.add(key);
        this.villageIndexSet.add(this.getCellIndex(col, row));
        this.addLocationFeatureAt(col, row, 'village');
    }

    private getTerrainColor = (type: TerrainType): string => theme.worldMap.terrain[type];

}
