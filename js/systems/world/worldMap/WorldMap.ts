import WorldMapTerrainCacheRenderer from './layers/WorldMapTerrainCacheRenderer.js';
export { KnownVillage, WorldVillageDirectionHint } from './WorldMapCore.js';

export default class WorldMap extends WorldMapTerrainCacheRenderer {
    constructor(columns: number, rows: number, cellSize: number, savedState?: Record<string, unknown>) {
        const restoredWorldSeed = typeof savedState?.worldSeed === 'number' ? savedState.worldSeed : undefined;
        super(columns, rows, cellSize, restoredWorldSeed);
        this.initializeWorldMap();
        if (savedState) {
            this.restoreState(savedState);
        }
    }

    public static readonly createNew = (columns: number, rows: number, cellSize: number): WorldMap =>
        new WorldMap(columns, rows, cellSize);

    public static readonly fromSavedState = (columns: number, rows: number, cellSize: number, savedState: Record<string, unknown>): WorldMap =>
        new WorldMap(columns, rows, cellSize, savedState);
}
