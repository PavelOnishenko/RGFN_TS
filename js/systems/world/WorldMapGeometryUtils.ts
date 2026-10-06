import { GridCell, TerrainNeighbors } from '../../types/game.js';

export default class WorldMapGeometryUtils {
    // Always fill the full cell. This removes anti-aliased seams and decorative ribbons
    // that can appear as bright/yellow border lines on some zoom levels.
    public createTerrainPath = (cell: GridCell, _neighbors?: TerrainNeighbors): Path2D => this.createCellRectPath(cell);

    public createCellRectPath(cell: GridCell): Path2D {
        const path = new Path2D();
        path.rect(cell.x, cell.y, cell.width, cell.height);
        return path;
    }

    public createRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): Path2D {
        const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
        const path = new Path2D();
        path.moveTo(x + safeRadius, y);
        path.lineTo(x + width - safeRadius, y);
        path.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
        path.lineTo(x + width, y + height - safeRadius);
        path.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
        path.lineTo(x + safeRadius, y + height);
        path.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
        path.lineTo(x, y + safeRadius);
        path.quadraticCurveTo(x, y, x + safeRadius, y);
        path.closePath();
        return path;
    }

    public addDiagonalRibbon(path: Path2D, x: number, y: number, width: number, height: number, corner: 'northWest' | 'northEast' | 'southWest' | 'southEast', active: boolean): void {
        if (!active) {
            return;
        }

        path.addPath(this.createDiagonalRibbonPath(x, y, width, height, corner));
    }

    public createDiagonalRibbonPath(x: number, y: number, width: number, height: number, corner: 'northWest' | 'northEast' | 'southWest' | 'southEast'): Path2D {
        const ribbon = new Path2D();
        const cornerPoints = this.getRibbonCornerPoints(x, y, width, height)[corner];

        ribbon.moveTo(cornerPoints.start[0], cornerPoints.start[1]);
        ribbon.quadraticCurveTo(cornerPoints.leftControl[0], cornerPoints.leftControl[1], cornerPoints.tip[0], cornerPoints.tip[1]);
        ribbon.quadraticCurveTo(cornerPoints.rightControl[0], cornerPoints.rightControl[1], cornerPoints.end[0], cornerPoints.end[1]);
        ribbon.quadraticCurveTo(cornerPoints.centerControl[0], cornerPoints.centerControl[1], cornerPoints.start[0], cornerPoints.start[1]);
        ribbon.closePath();
        return ribbon;
    }

    private getRibbonCornerPoints(x: number, y: number, width: number, height: number): Record<'northWest' | 'northEast' | 'southWest' | 'southEast', Record<'start' | 'tip' | 'end' | 'leftControl' | 'rightControl' | 'centerControl', [number, number]>> {
        return {
            northWest: { start: [x + (width * 0.48), y + (height * 0.26)], tip: [x + (width * 0.08), y + (height * 0.08)], end: [x + (width * 0.26), y + (height * 0.48)], leftControl: [x + (width * 0.24), y + (height * 0.18)], rightControl: [x + (width * 0.18), y + (height * 0.24)], centerControl: [x + (width * 0.38), y + (height * 0.38)] },
            northEast: { start: [x + (width * 0.52), y + (height * 0.26)], tip: [x + (width * 0.92), y + (height * 0.08)], end: [x + (width * 0.74), y + (height * 0.48)], leftControl: [x + (width * 0.76), y + (height * 0.18)], rightControl: [x + (width * 0.82), y + (height * 0.24)], centerControl: [x + (width * 0.62), y + (height * 0.38)] },
            southWest: { start: [x + (width * 0.26), y + (height * 0.52)], tip: [x + (width * 0.08), y + (height * 0.92)], end: [x + (width * 0.48), y + (height * 0.74)], leftControl: [x + (width * 0.18), y + (height * 0.76)], rightControl: [x + (width * 0.24), y + (height * 0.82)], centerControl: [x + (width * 0.38), y + (height * 0.62)] },
            southEast: { start: [x + (width * 0.74), y + (height * 0.52)], tip: [x + (width * 0.92), y + (height * 0.92)], end: [x + (width * 0.52), y + (height * 0.74)], leftControl: [x + (width * 0.82), y + (height * 0.76)], rightControl: [x + (width * 0.76), y + (height * 0.82)], centerControl: [x + (width * 0.62), y + (height * 0.62)] },
        };
    }
}
