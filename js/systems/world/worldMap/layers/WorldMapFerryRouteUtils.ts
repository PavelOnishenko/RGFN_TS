import { GridPosition } from '../../../../types/game.js';

type RoadPoint = { x: number; y: number };
type FerryRoutePair = { from: GridPosition; to: GridPosition; waterCells: number };

const toCell = (point: RoadPoint): GridPosition => ({ col: Math.floor(point.x), row: Math.floor(point.y) });

export const buildSamplePoints = (samples: number, sampleRoadLinkPoint: (t: number) => RoadPoint): RoadPoint[] => {
    const points: RoadPoint[] = [];
    for (let i = 0; i <= samples; i += 1) { points.push(sampleRoadLinkPoint(i / samples)); }
    return points;
};

export const detectFerryRoutePairs = (points: RoadPoint[], isWaterCell: (position: GridPosition) => boolean): FerryRoutePair[] => {
    const pairs: FerryRoutePair[] = [];
    let index = 0;
    while (index < points.length - 1) {
        if (!isWaterCell(toCell(points[index]))) { index += 1; continue; }
        const startWater = index;
        while (index < points.length && isWaterCell(toCell(points[index]))) { index += 1; }
        if (startWater > 0 && index < points.length) {
            pairs.push({ from: toCell(points[startWater - 1]), to: toCell(points[index]), waterCells: index - startWater });
        }
    }
    return pairs;
};
