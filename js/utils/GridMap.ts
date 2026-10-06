/**
 * GridMap - Rectangular grid for tile-based games
 * (Built for RGFN, might extract to engine if another game needs it)
 */
import { GridCell } from '../types/game.js';

export default class GridMap {
    public columns: number;
    public rows: number;
    public cellSize: number;
    public offsetX: number;
    public offsetY: number;
    public cells: GridCell[];

    constructor(columns: number, rows: number, cellSize: number, offsetX: number = 0, offsetY: number = 0) {
        this.columns = columns;
        this.rows = rows;
        this.cellSize = cellSize;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.cells = [];
        this.initializeCells();
    }

    initializeCells(): void {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                const cell = this.createCell(col, row);
                this.cells.push(cell);
            }
        }
    }

    createCell = (col: number, row: number): GridCell => ({
        col,
        row,
        x: this.offsetX + (col * this.cellSize),
        y: this.offsetY + (row * this.cellSize),
        width: this.cellSize,
        height: this.cellSize,
        data: {},
    });


    public updateLayout(cellSize: number, offsetX: number = this.offsetX, offsetY: number = this.offsetY): void {
        const previousCellSize = this.cellSize;
        const previousOffsetX = this.offsetX;
        const previousOffsetY = this.offsetY;
        this.cellSize = cellSize;
        this.offsetX = offsetX;
        this.offsetY = offsetY;

        const expectedCells = this.columns * this.rows;
        if (this.cells.length !== expectedCells) {
            this.cells = [];
            this.initializeCells();
            return;
        }

        const sameScale = previousCellSize === cellSize;
        const deltaX = offsetX - previousOffsetX;
        const deltaY = offsetY - previousOffsetY;

        for (const cell of this.cells) {
            if (sameScale) {
                cell.x += deltaX;
                cell.y += deltaY;
            } else {
                cell.x = offsetX + (cell.col * cellSize);
                cell.y = offsetY + (cell.row * cellSize);
                cell.width = cellSize;
                cell.height = cellSize;
            }
        }
    }

    getCellAt(col: number, row: number): GridCell | null {
        if (!this.isValidPosition(col, row)) {
            return null;
        }
        const index = row * this.columns + col;
        return this.cells[index] ?? null;
    }

    isValidPosition = (col: number, row: number): boolean => col >= 0 && col < this.columns && row >= 0 && row < this.rows;

    pixelToGrid(pixelX: number, pixelY: number): [number, number] {
        const col = Math.floor((pixelX - this.offsetX) / this.cellSize);
        const row = Math.floor((pixelY - this.offsetY) / this.cellSize);

        if (!this.isValidPosition(col, row)) {
            return [-1, -1];
        }

        return [col, row];
    }

    gridToPixel(col: number, row: number): [number, number] {
        const x = this.offsetX + (col * this.cellSize) + (this.cellSize / 2);
        const y = this.offsetY + (row * this.cellSize) + (this.cellSize / 2);
        return [x, y];
    }

    getCellAtPixel(pixelX: number, pixelY: number): GridCell | null {
        const [col, row] = this.pixelToGrid(pixelX, pixelY);
        return this.getCellAt(col, row);
    }

    forEachCell(callback: (cell: GridCell, col: number, row: number) => void): void {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                const cell = this.getCellAt(col, row);
                if (cell) {
                    callback(cell, col, row);
                }
            }
        }
    }

    getAllCells = (): GridCell[] => [...this.cells];

    getDistance = (col1: number, row1: number, col2: number, row2: number): number => Math.abs(col2 - col1) + Math.abs(row2 - row1);

    areAdjacent = (col1: number, row1: number, col2: number, row2: number): boolean => (
        this.getDistance(col1, row1, col2, row2) === 1
    );

    clearCellData(): void {
        this.forEachCell(cell => {
            cell.data = {};
        });
    }

    getDimensions = (): { columns: number; rows: number; width: number; height: number } => ({
        columns: this.columns,
        rows: this.rows,
        width: this.columns * this.cellSize,
        height: this.rows * this.cellSize,
    });
}
