// @ts-nocheck
import WorldMapPersistenceAndSelection from '../WorldMapPersistenceAndSelection.js';
import { FOG_STATE } from '../WorldMapCore.js';
export default class WorldMapFocusAndFogOverlay extends WorldMapPersistenceAndSelection {
    private findNamedLocationPosition(): GridPosition | null {
        const dims = this.grid.getDimensions();
        const attempts = dims.columns * dims.rows * 2;

        for (let attempt = 0; attempt < attempts; attempt += 1) {
            const col = this.seededInt(dims.columns, this.seededValue('named-location-col', attempt));
            const row = this.seededInt(dims.rows, this.seededValue('named-location-row', attempt));
            const terrain = this.getTerrain(col, row);
            const key = this.getCellKey(col, row);

            if (!terrain || terrain.type === 'water' || terrain.type === 'mountain' || this.namedLocationsHasCell(key)) {
                continue;
            }

            return { col, row };
        }

        return null;
    }

    private namedLocationsHasCell = (key: string): boolean => (
        Array.from(this.namedLocations.values()).some(
            (location) => this.getCellKey(location.position.col, location.position.row) === key,
        )
    );

    private isDiscovered = (col: number, row: number): boolean => (
        this.mapDisplayConfig.everythingDiscovered || this.getFogState(col, row) !== FOG_STATE.UNKNOWN
    );

    private drawNamedLocationFocus(ctx: CanvasRenderingContext2D): void {
        if (!this.focusedLocationName) {
            return;
        }

        const location = this.namedLocations.get(this.focusedLocationName);
        if (!location) {
            return;
        }

        const cell = this.grid.getCellAt(location.position.col, location.position.row);
        if (!cell) {
            return;
        }

        this.renderer.drawNamedLocationFocus(ctx, cell, location.name);
    }

    private drawFogOverlayForVisibleCells(
        ctx: CanvasRenderingContext2D,
        bounds: { startCol: number; endCol: number; startRow: number; endRow: number },
        detailLevel: 'low' | 'medium',
    ): void {
        for (let row = bounds.startRow; row <= bounds.endRow; row += 1) {
            for (let col = bounds.startCol; col <= bounds.endCol; col += 1) {
                this.drawFogCell(ctx, col, row, detailLevel);
            }
        }
    }

    private drawFogCell(ctx: CanvasRenderingContext2D, col: number, row: number, detailLevel: 'low' | 'medium'): void {
        const fogState = this.getFogState(col, row);
        if (fogState === FOG_STATE.DISCOVERED) {
            return;
        }
        const cell = this.getCellAt(col, row);
        if (!cell) {
            return;
        }
        const terrain = fogState === FOG_STATE.HIDDEN ? this.getTerrain(col, row) : undefined;
        const drawOptions = { showFogOverlay: this.mapDisplayConfig.fogOfWar, detailLevel };
        this.renderer.drawCell(ctx, cell, fogState, terrain, undefined, drawOptions);
        this.drawnTileCountThisFrame += 1;
        this.approxDrawCallsThisFrame += 1;
    }

    private getCellAt = (col: number, row: number): GridCell | undefined => this.grid.cells[this.getCellIndex(col, row)];

}
