// @ts-nocheck
/* eslint-disable style-guide/function-length-warning, style-guide/rule17-comma-layout */
import WorldMapFocusAndFogOverlay from './WorldMapFocusAndFogOverlay.js';
import { FOG_STATE } from '../WorldMapCore.js';

type ChunkBounds = { startCol: number; endCol: number; startRow: number; endRow: number };
type ChunkCacheLayer = {
    chunks: Map<string, { canvas: HTMLCanvasElement; col: number; row: number }>;
    invalidated: Set<string>;
    cellSize: number;
    revision: number;
};

export default class WorldMapTerrainCacheRenderer extends WorldMapFocusAndFogOverlay {
    private readonly cachedRenderCellTemplate = { col: 0, row: 0, x: 0, y: 0, width: 0, height: 0, data: {} };

    private getChunkSizeTiles = (): number => 20;

    private getChunkKey = (chunkCol: number, chunkRow: number): string => `${chunkCol},${chunkRow}`;

    private getChunkCoordBounds(chunkCol: number, chunkRow: number): ChunkBounds {
        const chunkSize = this.getChunkSizeTiles();
        const startCol = chunkCol * chunkSize;
        const startRow = chunkRow * chunkSize;
        const endCol = Math.min(this.grid.columns - 1, startCol + chunkSize - 1);
        const endRow = Math.min(this.grid.rows - 1, startRow + chunkSize - 1);
        return { startCol, endCol, startRow, endRow };
    }

    private ensureChunkLayer(
        layerName: 'terrain' | 'roads',
        detailLevel: 'low' | 'medium',
        cellSize: number,
        revision: number,
    ): ChunkCacheLayer {
        const caches = this.chunkLayerCaches ?? (this.chunkLayerCaches = {
            terrain: { low: null, medium: null },
            roads: { low: null, medium: null },
        });
        const current = caches[layerName][detailLevel];
        if (!current || current.cellSize !== cellSize || current.revision !== revision) {
            const nextLayer = { chunks: new Map(), invalidated: new Set(), cellSize, revision };
            caches[layerName][detailLevel] = nextLayer;
            this.noteCacheRebuild();
            return nextLayer;
        }
        return current;
    }

    private computeVisibleChunkBounds(
        bounds: ChunkBounds,
    ): { startChunkCol: number; endChunkCol: number; startChunkRow: number; endChunkRow: number } {
        const chunkSize = this.getChunkSizeTiles();
        return {
            startChunkCol: Math.floor(bounds.startCol / chunkSize),
            endChunkCol: Math.floor(bounds.endCol / chunkSize),
            startChunkRow: Math.floor(bounds.startRow / chunkSize),
            endChunkRow: Math.floor(bounds.endRow / chunkSize),
        };
    }

    private drawTerrainLayerFromCache(
        ctx: CanvasRenderingContext2D,
        bounds: ChunkBounds,
        detailLevel: 'low' | 'medium',
    ): boolean {
        if (!this.supportsTerrainLayerCaching(ctx)) {return false;}
        const cellSize = this.grid.cellSize;
        const layer = this.ensureChunkLayer('terrain', detailLevel, cellSize, this.terrainRevision);
        const renderOptions = { showFogOverlay: false, detailLevel };
        this.drawVisibleChunks(ctx, bounds, layer, (cacheCtx, chunkBounds) => {
            const cell = this.cachedRenderCellTemplate;
            cell.width = cellSize;
            cell.height = cellSize;
            const startCol = chunkBounds.startCol;
            const startRow = chunkBounds.startRow;
            for (let row = startRow; row <= chunkBounds.endRow; row += 1) {
                cell.row = row;
                cell.y = (row - startRow) * cellSize;
                for (let col = startCol; col <= chunkBounds.endCol; col += 1) {
                    cell.col = col;
                    cell.x = (col - startCol) * cellSize;
                    this.renderer.drawCell(
                        cacheCtx,
                        cell,
                        FOG_STATE.DISCOVERED,
                        this.getTerrain(col, row),
                        undefined,
                        renderOptions,
                    );
                }
            }
        });
        this.noteStaticRedraw();
        return true;
    }

    private drawRoadLayerFromCache(
        ctx: CanvasRenderingContext2D,
        bounds: ChunkBounds,
        detailLevel: 'low' | 'medium',
    ): boolean {
        if (!this.supportsTerrainLayerCaching(ctx)) {return false;}
        const cellSize = this.grid.cellSize;
        const layer = this.ensureChunkLayer('roads', detailLevel, cellSize, this.terrainRevision + this.fogRevision);
        this.drawVisibleChunks(ctx, bounds, layer, (cacheCtx, chunkBounds) => {
            this.drawVillageRoads(cacheCtx, chunkBounds, { chunkLocal: true });
        });
        this.noteStaticRedraw();
        return true;
    }

    private drawVisibleChunks(
        ctx: CanvasRenderingContext2D,
        bounds: ChunkBounds,
        layer: ChunkCacheLayer,
        redrawChunk: (cacheCtx: CanvasRenderingContext2D, chunkBounds: ChunkBounds) => void,
    ): void {
        const chunkBounds = this.computeVisibleChunkBounds(bounds);
        for (let chunkRow = chunkBounds.startChunkRow; chunkRow <= chunkBounds.endChunkRow; chunkRow += 1) {
            for (let chunkCol = chunkBounds.startChunkCol; chunkCol <= chunkBounds.endChunkCol; chunkCol += 1) {
                const chunkRect = this.getChunkCoordBounds(chunkCol, chunkRow);
                const canvas = this.getOrRebuildChunkCanvas(layer, chunkCol, chunkRow, chunkRect, redrawChunk);
                if (!canvas) {continue;}

                const destinationX = this.grid.offsetX + (chunkRect.startCol * layer.cellSize);
                const destinationY = this.grid.offsetY + (chunkRect.startRow * layer.cellSize);
                ctx.drawImage(canvas, destinationX, destinationY);
                this.approxDrawCallsThisFrame += 1;
            }
        }
    }

    private getOrRebuildChunkCanvas(
        layer: ChunkCacheLayer,
        chunkCol: number,
        chunkRow: number,
        chunkRect: ChunkBounds,
        redrawChunk: (cacheCtx: CanvasRenderingContext2D, chunkBounds: ChunkBounds) => void,
    ): HTMLCanvasElement | null {
        const key = this.getChunkKey(chunkCol, chunkRow);
        const chunk = layer.chunks.get(key);
        const shouldRebuild = !chunk || layer.invalidated.has(key);
        if (!shouldRebuild && chunk?.canvas) {
            this.noteCacheHit();
            return chunk.canvas;
        }

        const canvas = this.createChunkCanvas(chunkRect);
        const cacheCtx = canvas.getContext('2d');
        if (!cacheCtx) {
            return null;
        }
        redrawChunk(cacheCtx, chunkRect);
        layer.chunks.set(key, { canvas, col: chunkCol, row: chunkRow });
        layer.invalidated.delete(key);
        this.noteCacheRebuild();
        return canvas;
    }

    private createChunkCanvas(chunkRect: ChunkBounds): HTMLCanvasElement {
        const chunkWidth = (chunkRect.endCol - chunkRect.startCol + 1) * this.grid.cellSize;
        const chunkHeight = (chunkRect.endRow - chunkRect.startRow + 1) * this.grid.cellSize;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, chunkWidth);
        canvas.height = Math.max(1, chunkHeight);
        return canvas;
    }

    protected invalidateRoadCacheAroundCell(col: number, row: number): void {
        const caches = this.chunkLayerCaches?.roads;
        if (!caches) {return;}
        const chunkSize = this.getChunkSizeTiles();
        const chunkCol = Math.floor(col / chunkSize);
        const chunkRow = Math.floor(row / chunkSize);
        ['low', 'medium'].forEach((detailLevel: 'low' | 'medium') => {
            const layer = caches[detailLevel];
            if (!layer) {return;}
            for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
                for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
                    layer.invalidated.add(this.getChunkKey(chunkCol + colOffset, chunkRow + rowOffset));
                    this.noteInvalidatedChunk();
                }
            }
        });
    }

    private supportsTerrainLayerCaching = (ctx: CanvasRenderingContext2D): boolean => typeof document !== 'undefined' && typeof (ctx as CanvasRenderingContext2D & { drawImage?: unknown }).drawImage === 'function';
}
