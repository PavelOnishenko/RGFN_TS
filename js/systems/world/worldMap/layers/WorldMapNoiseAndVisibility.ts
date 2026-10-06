// @ts-nocheck
/* eslint-disable style-guide/function-length-warning */
import WorldMapWaterAndSettlements from './WorldMapWaterAndSettlements.js';
import { balanceConfig } from '../../../../config/balance/balanceConfig.js';
import { FOG_STATE } from '../WorldMapCore.js';
export default class WorldMapNoiseAndVisibility extends WorldMapWaterAndSettlements {
    private generateTerrainPattern(type: TerrainType, seed: number): TerrainData['pattern'] {
        const random = this.seededRandom(seed * 1.77);
        if (type === 'water') {
            return random > 0.45 ? 'waves' : 'lines';
        }
        if (type === 'desert') {
            return random > 0.5 ? 'dunes' : 'dots';
        }
        if (type === 'forest') {
            return random > 0.55 ? 'groves' : 'dots';
        }
        if (type === 'mountain') {
            return random > 0.4 ? 'ridges' : 'cross';
        }
        return random > 0.65 ? 'plain' : 'lines';
    }

    private fractalNoise(x: number, y: number, octaves: number, persistence: number, lacunarity: number): number {
        let amplitude = 1;
        let frequency = 1;
        let total = 0;
        let normalization = 0;

        for (let octave = 0; octave < octaves; octave++) {
            total += this.valueNoise(x * frequency, y * frequency) * amplitude;
            normalization += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return normalization === 0 ? 0 : total / normalization;
    }

    private valueNoise(x: number, y: number): number {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const sx = x - x0;
        const sy = y - y0;

        const n00 = this.hash2D(x0, y0);
        const n10 = this.hash2D(x1, y0);
        const n01 = this.hash2D(x0, y1);
        const n11 = this.hash2D(x1, y1);

        const ix0 = this.lerp(n00, n10, this.smoothStep(sx));
        const ix1 = this.lerp(n01, n11, this.smoothStep(sx));
        return this.lerp(ix0, ix1, this.smoothStep(sy));
    }

    private hash2D(x: number, y: number): number {
        const seed = Math.sin((x * 127.1) + (y * 311.7) + this.worldSeed) * 43758.5453123;
        return seed - Math.floor(seed);
    }

    private smoothStep = (value: number): number => value * value * (3 - (2 * value));

    private lerp = (a: number, b: number, t: number): number => a + ((b - a) * t);

    private clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

    private seededRandom(seed: number): number {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    private createWorldSeed = (): number => Math.floor(Math.random() * 0x7fffffff);

    private hashSeed(...parts: number[]): number {
        let value = this.worldSeed || 1;
        for (const part of parts) {
            value = Math.imul(value ^ Math.floor(part), 1664525) + 1013904223;
            value >>>= 0;
        }
        return value;
    }

    private seededValue(label: string, index: number): number {
        const labelHash = Array.from(label).reduce((total, char, charIndex) => total + (char.charCodeAt(0) * (charIndex + 1)), 0);
        return this.seededRandom(this.hashSeed(labelHash, index + 1));
    }

    private seededInt = (maxExclusive: number, randomValue: number): number => Math.floor(randomValue * maxExclusive);

    private getCellKey = (col: number, row: number): string => `${col},${row}`;

    private getCellIndex = (col: number, row: number): number => (row * this.grid.columns) + col;

    private refreshVisibility(): void {
        this.fogRevision += 1;
        this.noteRedrawCause('visibilityFogChange');
        for (let index = 0; index < this.fogStatesByIndex.length; index += 1) {
            if (this.fogStatesByIndex[index] === FOG_STATE.DISCOVERED) {
                this.fogStatesByIndex[index] = FOG_STATE.HIDDEN;
            }
        }

        this.grid.forEachCell((_cell: GridCell, col: number, row: number) => {
            if (!this.isCellVisible(col, row)) {
                return;
            }
            this.fogStatesByIndex[this.getCellIndex(col, row)] = FOG_STATE.DISCOVERED;
        });

        this.grid.forEachCell((_cell: GridCell, col: number, row: number) => {
            const key = this.getCellKey(col, row);
            this.fogStates.set(key, this.fogStatesByIndex[this.getCellIndex(col, row)] ?? FOG_STATE.UNKNOWN);
        });
        const visibilityRadius = balanceConfig.worldMap.visibilityRadius ?? 2;
        for (let dy = -visibilityRadius - 1; dy <= visibilityRadius + 1; dy += 1) {
            for (let dx = -visibilityRadius - 1; dx <= visibilityRadius + 1; dx += 1) {
                if (typeof this.invalidateRoadCacheAroundCell === 'function') {
                    this.invalidateRoadCacheAroundCell(this.playerGridPos.col + dx, this.playerGridPos.row + dy);
                }
            }
        }
        this.invalidateOverlayRedraw();
    }

    private getFogState(col: number, row: number): FogState {
        const storedFogState = this.fogStates.get(this.getCellKey(col, row))
            || this.fogStatesByIndex[this.getCellIndex(col, row)]
            || FOG_STATE.UNKNOWN;

        if (this.mapDisplayConfig.everythingDiscovered) {
            return FOG_STATE.DISCOVERED;
        }

        if (!this.mapDisplayConfig.fogOfWar && storedFogState === FOG_STATE.UNKNOWN) {
            return FOG_STATE.HIDDEN;
        }

        return storedFogState;
    }

    private getTerrain = (col: number, row: number): TerrainData | undefined => (
        this.terrainData.get(this.getCellKey(col, row))
        ?? this.terrainByIndex[this.getCellIndex(col, row)]
    );

    public isCellVisible(col: number, row: number): boolean {
        if (!this.grid.isValidPosition(col, row)) {
            return false;
        }

        const dx = col - this.playerGridPos.col;
        const dy = row - this.playerGridPos.row;
        const visibilityRadius = balanceConfig.worldMap.visibilityRadius ?? 2;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > visibilityRadius) {
            return false;
        }

        if (dx === 0 && dy === 0) {
            return true;
        }

        const line = this.getLineBetween(this.playerGridPos.col, this.playerGridPos.row, col, row);
        for (let index = 1; index < line.length; index += 1) {
            const step = line[index];
            const terrain = this.getTerrain(step.col, step.row);
            if (!terrain) {
                return false;
            }

            const isTarget = step.col === col && step.row === row;
            if (terrain.type === 'forest') {
                return isTarget;
            }

            if (terrain.type === 'mountain') {
                return isTarget;
            }
        }

        return true;
    }

}
