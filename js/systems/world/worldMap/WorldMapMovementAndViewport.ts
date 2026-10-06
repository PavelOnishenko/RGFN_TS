// @ts-nocheck
import WorldMapNoiseAndVisibility from './layers/WorldMapNoiseAndVisibility.js';
import { theme } from '../../../config/ThemeConfig.js';
import { FOG_STATE } from './WorldMapCore.js';
export default class WorldMapMovementAndViewport extends WorldMapNoiseAndVisibility {
    private getTerrainNeighbors(col: number, row: number, terrainType: TerrainType): TerrainNeighbors {
        const isSameVisibleTerrain = (targetCol: number, targetRow: number): boolean => {
            const fogState = this.getFogState(targetCol, targetRow);
            if (fogState === FOG_STATE.UNKNOWN) {
                return false;
            }

            const terrain = this.getTerrain(targetCol, targetRow);
            return terrain?.type === terrainType;
        };

        return {
            north: isSameVisibleTerrain(col, row - 1),
            south: isSameVisibleTerrain(col, row + 1),
            east: isSameVisibleTerrain(col + 1, row),
            west: isSameVisibleTerrain(col - 1, row),
            northEast: isSameVisibleTerrain(col + 1, row - 1),
            northWest: isSameVisibleTerrain(col - 1, row - 1),
            southEast: isSameVisibleTerrain(col + 1, row + 1),
            southWest: isSameVisibleTerrain(col - 1, row + 1),
        };
    }

    private getLineBetween(startCol: number, startRow: number, endCol: number, endRow: number): GridPosition[] {
        const points: GridPosition[] = [];
        let currentCol = startCol;
        let currentRow = startRow;
        const deltaCol = Math.abs(endCol - startCol);
        const deltaRow = Math.abs(endRow - startRow);
        const stepCol = startCol < endCol ? 1 : -1;
        const stepRow = startRow < endRow ? 1 : -1;
        let error = deltaCol - deltaRow;

        while (true) {
            points.push({ col: currentCol, row: currentRow });
            if (currentCol === endCol && currentRow === endRow) {
                break;
            }

            const doubleError = error * 2;
            if (doubleError > -deltaRow) {
                error -= deltaRow;
                currentCol += stepCol;
            }
            if (doubleError < deltaCol) {
                error += deltaCol;
                currentRow += stepRow;
            }
        }

        return points;
    }

    public movePlayer(direction: Direction): { moved: boolean; isPreviouslyDiscovered: boolean } {
        const { col, row } = this.playerGridPos;
        const directionOffsets: Record<Direction, GridPosition> = {
            up: { col: 0, row: -1 },
            down: { col: 0, row: 1 },
            left: { col: -1, row: 0 },
            right: { col: 1, row: 0 },
            upLeft: { col: -1, row: -1 },
            upRight: { col: 1, row: -1 },
            downLeft: { col: -1, row: 1 },
            downRight: { col: 1, row: 1 },
        };
        const offset = directionOffsets[direction];
        const newCol = col + offset.col;
        const newRow = row + offset.row;

        if (this.grid.isValidPosition(newCol, newRow)) {
            const destinationTerrain = this.getTerrain(newCol, newRow);
            if (destinationTerrain?.type === 'water') {
                return { moved: false, isPreviouslyDiscovered: false };
            }

            const destinationKey = this.getCellKey(newCol, newRow);
            const isPreviouslyDiscovered = this.visitedCells.has(destinationKey);
            this.playerGridPos = { col: newCol, row: newRow };
            this.visitedCells.add(destinationKey);
            this.refreshVisibility();
            this.ensureCellIsVisible(newCol, newRow);
            this.invalidateWorldRedraw();
            return { moved: true, isPreviouslyDiscovered };
        }
        return { moved: false, isPreviouslyDiscovered: false };
    }

    public resizeToCanvas(canvasWidth: number, canvasHeight: number): void {
        this.canvasWidth = Math.max(1, Math.floor(canvasWidth));
        this.canvasHeight = Math.max(1, Math.floor(canvasHeight));

        const configuredCellSize = theme.worldMap.cellSize.default;
        const nextCellSize = this.grid.cellSize > 0 ? this.grid.cellSize : configuredCellSize;
        this.grid.updateLayout(nextCellSize, this.grid.offsetX, this.grid.offsetY);
        this.clampViewport();
        this.invalidateWorldRedraw();
    }

    public centerOnPlayer(): void {
        this.centerViewportOnCell(this.playerGridPos.col, this.playerGridPos.row);
    }

    public zoomIn = (): boolean => this.zoomBy(theme.worldMap.cellSize.zoomStep);

    public zoomOut = (): boolean => this.zoomBy(-theme.worldMap.cellSize.zoomStep);

    private zoomBy(delta: number): boolean {
        const minCellSize = theme.worldMap.cellSize.min;
        const maxCellSize = theme.worldMap.cellSize.max;
        const nextCellSize = Math.max(minCellSize, Math.min(maxCellSize, this.grid.cellSize + delta));
        if (nextCellSize === this.grid.cellSize) {
            return false;
        }

        const centerCol = (this.canvasWidth / 2 - this.grid.offsetX) / this.grid.cellSize;
        const centerRow = (this.canvasHeight / 2 - this.grid.offsetY) / this.grid.cellSize;
        const nextOffsetX = Math.round((this.canvasWidth / 2) - (centerCol * nextCellSize));
        const nextOffsetY = Math.round((this.canvasHeight / 2) - (centerRow * nextCellSize));
        this.grid.updateLayout(nextCellSize, nextOffsetX, nextOffsetY);
        this.clampViewport();
        this.markZoomChangedThisFrame();
        return true;
    }

    public pan(direction: 'up' | 'down' | 'left' | 'right'): boolean {
        const stepCells = Math.max(1, theme.worldMap.cellSize.panStepCells);
        const step = stepCells * this.grid.cellSize;
        const offsets = { up: { x: 0, y: step }, down: { x: 0, y: -step }, left: { x: step, y: 0 }, right: { x: -step, y: 0 } }[direction];
        const beforeX = this.grid.offsetX;
        const beforeY = this.grid.offsetY;
        this.grid.updateLayout(this.grid.cellSize, beforeX + offsets.x, beforeY + offsets.y);
        this.clampViewport();
        const changed = beforeX !== this.grid.offsetX || beforeY !== this.grid.offsetY;
        if (changed) {
            this.markCameraMovedThisFrame();
        }
        return changed;
    }

    public panByPixels(deltaX: number, deltaY: number): boolean {
        if (deltaX === 0 && deltaY === 0) {
            return false;
        }

        const beforeX = this.grid.offsetX;
        const beforeY = this.grid.offsetY;
        this.grid.updateLayout(this.grid.cellSize, beforeX + deltaX, beforeY + deltaY);
        this.clampViewport();
        const changed = beforeX !== this.grid.offsetX || beforeY !== this.grid.offsetY;
        if (changed) {
            this.markCameraMovedThisFrame();
        }
        return changed;
    }

    private centerViewportOnCell(col: number, row: number): void {
        const offsetX = Math.round((this.canvasWidth / 2) - ((col + 0.5) * this.grid.cellSize) + theme.worldMap.gridOffset.x);
        const offsetY = Math.round((this.canvasHeight / 2) - ((row + 0.5) * this.grid.cellSize) + theme.worldMap.gridOffset.y);
        this.grid.updateLayout(this.grid.cellSize, offsetX, offsetY);
        this.clampViewport();
        this.markCameraMovedThisFrame();
    }

    private ensureCellIsVisible(col: number, row: number): void {
        const left = this.grid.offsetX + (col * this.grid.cellSize);
        const right = left + this.grid.cellSize;
        const top = this.grid.offsetY + (row * this.grid.cellSize);
        const bottom = top + this.grid.cellSize;
        let offsetX = this.grid.offsetX;
        let offsetY = this.grid.offsetY;

        if (left < 0) {
            offsetX += -left + theme.worldMap.gridOffset.x;
        } else if (right > this.canvasWidth) {
            offsetX -= right - this.canvasWidth;
        }

        if (top < 0) {
            offsetY += -top + theme.worldMap.gridOffset.y;
        } else if (bottom > this.canvasHeight) {
            offsetY -= bottom - this.canvasHeight;
        }

        this.grid.updateLayout(this.grid.cellSize, offsetX, offsetY);
        this.clampViewport();
        this.markCameraMovedThisFrame();
    }

}
