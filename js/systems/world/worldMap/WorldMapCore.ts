// @ts-nocheck
/* eslint-disable style-guide/file-length-error, style-guide/function-length-error, style-guide/function-length-warning */
import GridMap from '../../../utils/GridMap.js';
import { FogState, MapDisplayConfig, TerrainData, GridPosition, GridCell, TerrainType } from '../../types/game.js';
import WorldMapRenderer from './WorldMapRenderer.js';
import { LocationFeatureId } from './locationFeatures/LocationFeatureDefinition.js';

export type KnownVillage = {
    name: string;
    col: number;
    row: number;
    terrain: TerrainType;
    status: 'current' | 'mapped';
};

export type WorldVillageDirectionHint = {
    settlementName: string;
    exists: boolean;
    direction?: 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west';
    distanceCells?: number;
};

export const FOG_STATE = { UNKNOWN: 'unknown' as FogState, DISCOVERED: 'discovered' as FogState, HIDDEN: 'hidden' as FogState };

const DEFAULT_MAP_DISPLAY_CONFIG: MapDisplayConfig = { everythingDiscovered: false, fogOfWar: true };

type NamedLocation = {
    name: string;
    position: GridPosition;
    terrainType: TerrainType;
};

type VillageRoadPoint = {
    x: number;
    y: number;
};

type VillageRoadLink = {
    from: GridPosition;
    to: GridPosition;
    control1: VillageRoadPoint;
    control2: VillageRoadPoint;
};

type FerryDockRoute = {
    from: GridPosition;
    to: GridPosition;
    waterCells: number;
};

type TerrainLayerCache = {
    canvas: HTMLCanvasElement;
    cellSize: number;
    terrainRevision: number;
    detailLevel: 'low' | 'medium';
};

type DrawProfileStats = {
    frames: number;
    totalMs: number;
    maxMs: number;
    lastFrameMs: number;
};
type RenderFpsCap = 'uncapped' | 60 | 30;
type DevicePixelRatioClamp = 'auto' | 1 | 1.5;

type WorldMapRenderLayerToggles = {
    terrain: boolean;
    roads: boolean;
    locations: boolean;
    character: boolean;
    selectionCursor: boolean;
};

export default class WorldMapCore {
    private grid: GridMap;
    private playerGridPos: GridPosition;
    private fogStates: Map<string, FogState>;
    private terrainData: Map<string, TerrainData>;
    private villages: Set<string>;
    private visitedCells: Set<string>;
    private selectedGridPos: GridPosition | null;
    private renderer: WorldMapRenderer;
    private namedLocations: Map<string, NamedLocation>;
    private focusedLocationName: string | null;
    private worldSeed: number;
    private canvasWidth: number;
    private canvasHeight: number;
    private mapDisplayConfig: MapDisplayConfig;
    private fogStatesByIndex: FogState[];
    private terrainByIndex: Array<TerrainData | undefined>;
    private villageIndexSet: Set<number>;
    private roadIndexSet: Set<number>;
    private villageRoadLinks: VillageRoadLink[];
    private ferryDockIndexSet: Set<number>;
    private ferryDockRoutesByIndex: Map<number, FerryDockRoute[]>;
    private locationFeatureIndexMap: Map<number, Set<LocationFeatureId>>;
    private terrainLayerCaches: Partial<Record<'low' | 'medium', TerrainLayerCache>>;
    private fogRevision: number;
    private terrainRevision: number;
    private drawProfilingEnabled: boolean;
    private drawProfileStats: Record<'drawTotal' | 'visibleTileCalculation' | 'terrain' | 'roads' | 'entities' | 'cursorSelection' | 'overlayDebug', DrawProfileStats>;
    protected renderLayerToggles: WorldMapRenderLayerToggles;
    protected daylightFactor: number;
    protected worldNeedsRedraw: boolean;
    protected overlayNeedsRedraw: boolean;
    protected uiNeedsRedraw: boolean;
    protected cameraMovedThisFrame: boolean;
    protected zoomChangedThisFrame: boolean;
    protected hoveredTileChangedThisFrame: boolean;
    protected redrawCauseCounts: Record<string, number>;
    protected staticFrameCanvas: HTMLCanvasElement | null;
    protected visibleTileCountThisFrame: number;
    protected drawnTileCountThisFrame: number;
    protected approxDrawCallsThisFrame: number;
    protected frameSkippedNoRedrawThisFrame: boolean;
    protected fullRedrawCount: number;
    protected skippedNoRedrawCount: number;
    protected cacheHits: number;
    protected cacheRebuilds: number;
    protected invalidatedChunkCount: number;
    protected chunkRedrawCount: number;
    protected staticRedrawCount: number;
    protected dynamicRedrawCount: number;
    protected fullRecompositionCount: number;
    protected visibilityPauseCount: number;
    protected renderPausedForVisibility: boolean;
    protected frameTimesMs: number[];
    protected lastFrameMs: number;
    protected lastUpdateMs: number;
    protected lastRenderMs: number;
    protected lastRenderAtMs: number;
    protected renderFpsCap: RenderFpsCap;
    protected devicePixelRatioClamp: DevicePixelRatioClamp;
    protected canvasPixelWidth: number;
    protected canvasPixelHeight: number;
    protected currentDevicePixelRatio: number;
    protected lastRenderTier: 'near' | 'mid' | 'far' | null;

    constructor(columns: number, rows: number, cellSize: number, restoredWorldSeed?: number) {
        this.grid = new GridMap(columns, rows, cellSize);
        this.initializeCoreState(columns, rows, cellSize, restoredWorldSeed);
    }

    private initializeCoreState(columns: number, rows: number, cellSize: number, restoredWorldSeed?: number): void {
        this.playerGridPos = { col: 0, row: 0 };
        this.fogStates = new Map();
        this.terrainData = new Map();
        this.villages = new Set();
        this.visitedCells = new Set();
        this.selectedGridPos = null;
        this.renderer = new WorldMapRenderer();
        this.namedLocations = new Map<string, NamedLocation>();
        this.focusedLocationName = null;
        this.worldSeed = typeof restoredWorldSeed === 'number' && Number.isFinite(restoredWorldSeed)
            ? Math.floor(Math.abs(restoredWorldSeed))
            : this.createWorldSeed();
        this.canvasWidth = columns * cellSize;
        this.canvasHeight = rows * cellSize;
        this.mapDisplayConfig = { ...DEFAULT_MAP_DISPLAY_CONFIG };
        this.fogStatesByIndex = [];
        this.terrainByIndex = [];
        this.villageIndexSet = new Set<number>();
        this.roadIndexSet = new Set<number>();
        this.villageRoadLinks = [];
        this.ferryDockIndexSet = new Set<number>();
        this.ferryDockRoutesByIndex = new Map<number, FerryDockRoute[]>();
        this.locationFeatureIndexMap = new Map<number, Set<LocationFeatureId>>();
        this.terrainLayerCaches = {};
        this.fogRevision = 0;
        this.terrainRevision = 0;
        this.drawProfilingEnabled = false;
        this.drawProfileStats = this.createEmptyDrawProfileStats();
        this.renderLayerToggles = this.createDefaultRenderLayerToggles();
        this.daylightFactor = 1;
        this.worldNeedsRedraw = true;
        this.overlayNeedsRedraw = true;
        this.uiNeedsRedraw = true;
        this.cameraMovedThisFrame = false;
        this.zoomChangedThisFrame = false;
        this.hoveredTileChangedThisFrame = false;
        this.redrawCauseCounts = this.createInitialRedrawCauseCounts();
        this.staticFrameCanvas = null;
        this.visibleTileCountThisFrame = 0;
        this.drawnTileCountThisFrame = 0;
        this.approxDrawCallsThisFrame = 0;
        this.frameSkippedNoRedrawThisFrame = false;
        this.fullRedrawCount = 0;
        this.skippedNoRedrawCount = 0;
        this.cacheHits = 0;
        this.cacheRebuilds = 0;
        this.invalidatedChunkCount = 0;
        this.chunkRedrawCount = 0;
        this.staticRedrawCount = 0;
        this.dynamicRedrawCount = 0;
        this.fullRecompositionCount = 0;
        this.visibilityPauseCount = 0;
        this.renderPausedForVisibility = false;
        this.frameTimesMs = [];
        this.lastFrameMs = 0;
        this.lastUpdateMs = 0;
        this.lastRenderMs = 0;
        this.lastRenderAtMs = 0;
        this.renderFpsCap = 'uncapped';
        this.devicePixelRatioClamp = 'auto';
        this.canvasPixelWidth = Math.max(1, Math.floor(columns * cellSize));
        this.canvasPixelHeight = Math.max(1, Math.floor(rows * cellSize));
        this.currentDevicePixelRatio = 1;
        this.lastRenderTier = null;
    }

    private readonly createEmptyStat = (): DrawProfileStats => ({ frames: 0, totalMs: 0, maxMs: 0, lastFrameMs: 0 });
    private readonly createDefaultRenderLayerToggles = (): WorldMapRenderLayerToggles => ({
        terrain: true,
        roads: true,
        locations: true,
        character: true,
        selectionCursor: true,
    });

    private readonly createInitialRedrawCauseCounts = (): Record<string, number> => ({
        cameraMovement: 0,
        zoomChange: 0,
        hoverTileChange: 0,
        selectionChange: 0,
        diagnosticsUiChange: 0,
        visibilityFogChange: 0,
        mapContentChange: 0,
        forcedFullRedraw: 0,
    });

    protected noteRedrawCause = (cause: keyof ReturnType<WorldMapCore['createInitialRedrawCauseCounts']>): void => {
        this.redrawCauseCounts[cause] = (this.redrawCauseCounts[cause] ?? 0) + 1;
    };

    private readonly createEmptyDrawProfileStats = (): Record<'drawTotal' | 'visibleTileCalculation' | 'terrain' | 'roads' | 'entities' | 'cursorSelection' | 'overlayDebug', DrawProfileStats> => ({
        drawTotal: this.createEmptyStat(),
        visibleTileCalculation: this.createEmptyStat(),
        terrain: this.createEmptyStat(),
        roads: this.createEmptyStat(),
        entities: this.createEmptyStat(),
        cursorSelection: this.createEmptyStat(),
        overlayDebug: this.createEmptyStat(),
    });

    public setDrawProfilingEnabled = (enabled: boolean): void => {
        this.drawProfilingEnabled = Boolean(enabled);
    };

    public isDrawProfilingEnabled = (): boolean => this.drawProfilingEnabled;

    public resetDrawProfiling = (): void => {
        this.drawProfileStats = this.createEmptyDrawProfileStats();
    };

    protected recordDrawProfileSection(
        section: 'drawTotal' | 'visibleTileCalculation' | 'terrain' | 'roads' | 'entities' | 'cursorSelection' | 'overlayDebug',
        elapsedMs: number,
    ): void {
        if (!this.drawProfilingEnabled || !Number.isFinite(elapsedMs)) {
            return;
        }
        const stats = this.drawProfileStats[section];
        stats.frames += 1;
        stats.totalMs += elapsedMs;
        stats.maxMs = Math.max(stats.maxMs, elapsedMs);
        stats.lastFrameMs = elapsedMs;
    }

    public getDrawProfilingSnapshot(): Record<'drawTotal' | 'visibleTileCalculation' | 'terrain' | 'roads' | 'entities' | 'cursorSelection' | 'overlayDebug', { frames: number; avgMs: number; maxMs: number; lastFrameMs: number }> {
        const snapshot = {} as Record<'drawTotal' | 'visibleTileCalculation' | 'terrain' | 'roads' | 'entities' | 'cursorSelection' | 'overlayDebug', { frames: number; avgMs: number; maxMs: number; lastFrameMs: number }>;
        const sections = Object.keys(this.drawProfileStats) as Array<'drawTotal' | 'visibleTileCalculation' | 'terrain' | 'roads' | 'entities' | 'cursorSelection' | 'overlayDebug'>;
        sections.forEach((section) => {
            const stats = this.drawProfileStats[section];
            snapshot[section] = { frames: stats.frames, avgMs: stats.frames > 0 ? stats.totalMs / stats.frames : 0, maxMs: stats.maxMs, lastFrameMs: stats.lastFrameMs };
        });
        return snapshot;
    }

    public setRenderLayerToggles = (toggles: Partial<WorldMapRenderLayerToggles>): void => {
        this.renderLayerToggles = { ...this.renderLayerToggles, ...toggles };
        this.noteRedrawCause('diagnosticsUiChange');
        this.invalidateWorldRedraw();
    };

    public getRenderLayerToggles = (): WorldMapRenderLayerToggles => ({ ...this.renderLayerToggles });

    public setDaylightFactor(factor: number): void {
        if (!Number.isFinite(factor)) {
            return;
        }
        this.daylightFactor = Math.max(0.35, Math.min(1.1, factor));
        this.noteRedrawCause('mapContentChange');
        this.invalidateWorldRedraw();
    }

    protected invalidateWorldRedraw = (): void => {
        this.worldNeedsRedraw = true;
    };

    protected invalidateOverlayRedraw = (): void => {
        this.overlayNeedsRedraw = true;
    };

    protected invalidateUiRedraw = (): void => {
        this.uiNeedsRedraw = true;
    };

    public markCameraMovedThisFrame(): void {
        this.cameraMovedThisFrame = true;
        this.noteRedrawCause('cameraMovement');
        this.invalidateWorldRedraw();
    }

    public markZoomChangedThisFrame(): void {
        this.zoomChangedThisFrame = true;
        this.noteRedrawCause('zoomChange');
        this.invalidateWorldRedraw();
    }

    public noteHoverTileChangedThisFrame(): void {
        this.hoveredTileChangedThisFrame = true;
        this.noteRedrawCause('hoverTileChange');
        this.noteRedrawCause('selectionChange');
        this.invalidateOverlayRedraw();
        this.invalidateUiRedraw();
    }

    public resetPerFrameFlags(): void {
        this.cameraMovedThisFrame = false;
        this.zoomChangedThisFrame = false;
        this.hoveredTileChangedThisFrame = false;
        this.redrawCauseCounts = this.createInitialRedrawCauseCounts();
        this.staticFrameCanvas = null;
    }

    public setLastUpdateMs(elapsedMs: number): void {
        if (Number.isFinite(elapsedMs)) {
            this.lastUpdateMs = elapsedMs;
        }
    }

    public setRenderFpsCap = (cap: 'uncapped' | '60' | '30'): void => {
        this.renderFpsCap = cap === '60' ? 60 : cap === '30' ? 30 : 'uncapped';
    };

    public getRenderFpsCap = (): 'uncapped' | '60' | '30' => (this.renderFpsCap === 'uncapped' ? 'uncapped' : String(this.renderFpsCap) as '60' | '30');

    public setDevicePixelRatioClamp(clamp: 'auto' | '1' | '1.5'): void {
        this.devicePixelRatioClamp = clamp === '1' ? 1 : clamp === '1.5' ? 1.5 : 'auto';
        this.noteRedrawCause('diagnosticsUiChange');
        this.invalidateWorldRedraw();
    }

    public getDevicePixelRatioClamp = (): 'auto' | '1' | '1.5' => (
        this.devicePixelRatioClamp === 'auto' ? 'auto' : String(this.devicePixelRatioClamp) as '1' | '1.5'
    );

    public getEffectiveDevicePixelRatio(rawDevicePixelRatio: number): number {
        const safeDpr = Number.isFinite(rawDevicePixelRatio) && rawDevicePixelRatio > 0 ? rawDevicePixelRatio : 1;
        const effective = this.devicePixelRatioClamp === 'auto' ? safeDpr : Math.min(safeDpr, this.devicePixelRatioClamp);
        this.currentDevicePixelRatio = effective;
        return effective;
    }

    public setCanvasPixelSize(width: number, height: number): void {
        this.canvasPixelWidth = Math.max(1, Math.floor(width));
        this.canvasPixelHeight = Math.max(1, Math.floor(height));
    }

    public shouldRenderThisFrame(nowMs: number): boolean {
        if (this.renderPausedForVisibility) {
            return false;
        }
        if (!this.worldNeedsRedraw && !this.overlayNeedsRedraw && !this.uiNeedsRedraw) {
            this.frameSkippedNoRedrawThisFrame = true;
            this.skippedNoRedrawCount += 1;
            return false;
        }
        if (this.renderFpsCap !== 'uncapped') {
            const minDelta = 1000 / this.renderFpsCap;
            if ((nowMs - this.lastRenderAtMs) < minDelta) {
                return false;
            }
        }
        return true;
    }

    public beginRenderFrame(nowMs: number): void {
        this.frameSkippedNoRedrawThisFrame = false;
        this.visibleTileCountThisFrame = 0;
        this.drawnTileCountThisFrame = 0;
        this.approxDrawCallsThisFrame = 0;
        this.lastRenderAtMs = nowMs;
    }

    public finishRenderFrame(elapsedMs: number): void {
        this.lastRenderMs = elapsedMs;
        this.lastFrameMs = elapsedMs;
        this.frameTimesMs.push(elapsedMs);
        if (this.frameTimesMs.length > 60) {
            this.frameTimesMs.shift();
        }
        this.fullRedrawCount += 1;
        this.fullRecompositionCount += 1;
        this.worldNeedsRedraw = false;
        this.overlayNeedsRedraw = false;
        this.uiNeedsRedraw = false;
    }

    protected noteCacheHit = (): void => {
        this.cacheHits += 1;
    };

    protected noteCacheRebuild = (chunkCount = 1): void => {
        this.cacheRebuilds += 1;
        this.chunkRedrawCount += Math.max(1, Math.floor(chunkCount));
    };

    protected noteInvalidatedChunk = (count = 1): void => {
        this.invalidatedChunkCount += Math.max(1, Math.floor(count));
    };

    protected noteStaticRedraw = (): void => {
        this.staticRedrawCount += 1;
    };

    protected noteDynamicRedraw = (): void => {
        this.dynamicRedrawCount += 1;
    };

    public setRenderVisibilityState(hidden: boolean): void {
        if (hidden) {
            if (!this.renderPausedForVisibility) {
                this.visibilityPauseCount += 1;
            }
            this.renderPausedForVisibility = true;
            return;
        }
        this.renderPausedForVisibility = false;
        this.noteRedrawCause('forcedFullRedraw');
        this.invalidateWorldRedraw();
        this.invalidateOverlayRedraw();
        this.invalidateUiRedraw();
    }

    public getPerformanceSnapshot(): Record<string, unknown> {
        const avgFrameMs = this.frameTimesMs.length > 0
            ? this.frameTimesMs.reduce((sum, value) => sum + value, 0) / this.frameTimesMs.length
            : 0;
        return {
            fps: this.lastFrameMs > 0 ? 1000 / this.lastFrameMs : 0,
            avgFrameMs,
            updateMs: this.lastUpdateMs,
            renderMs: this.lastRenderMs,
            visibleTileCount: this.visibleTileCountThisFrame,
            drawnTileCount: this.drawnTileCountThisFrame,
            approximateDrawCalls: this.approxDrawCallsThisFrame,
            fullRedrawCount: this.fullRedrawCount,
            staticRedrawCount: this.staticRedrawCount,
            dynamicRedrawCount: this.dynamicRedrawCount,
            fullRecompositionCount: this.fullRecompositionCount,
            cacheHits: this.cacheHits,
            cacheRebuilds: this.cacheRebuilds,
            chunkRedrawCount: this.chunkRedrawCount,
            invalidatedChunkCount: this.invalidatedChunkCount,
            cameraMovedThisFrame: this.cameraMovedThisFrame,
            zoomChangedThisFrame: this.zoomChangedThisFrame,
            hoveredTileChangedThisFrame: this.hoveredTileChangedThisFrame,
            canvasPixelSize: `${this.canvasPixelWidth}x${this.canvasPixelHeight}`,
            currentDevicePixelRatio: this.currentDevicePixelRatio,
            renderPausedForVisibility: this.renderPausedForVisibility,
            visibilityPauseCount: this.visibilityPauseCount,
            frameSkippedBecauseNoRedrawWasNeeded: this.frameSkippedNoRedrawThisFrame,
            skippedNoRedrawCount: this.skippedNoRedrawCount,
            dirtyFlags: { worldNeedsRedraw: this.worldNeedsRedraw, overlayNeedsRedraw: this.overlayNeedsRedraw, uiNeedsRedraw: this.uiNeedsRedraw },
            redrawCauses: { ...this.redrawCauseCounts },
        };
    }

    protected ensureStaticFrameCanvas(width: number, height: number): CanvasRenderingContext2D | null {
        const nextWidth = Math.max(1, Math.floor(width));
        const nextHeight = Math.max(1, Math.floor(height));
        if (!this.staticFrameCanvas || this.staticFrameCanvas.width !== nextWidth || this.staticFrameCanvas.height !== nextHeight) {
            if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
                this.staticFrameCanvas = null;
                return null;
            }
            const canvas = document.createElement('canvas');
            canvas.width = nextWidth;
            canvas.height = nextHeight;
            this.staticFrameCanvas = canvas;
        }
        return this.staticFrameCanvas.getContext('2d');
    }

    protected initializeWorldMap(): void {
        this.initializeFogOfWar();
        this.generateWorld();
        this.visitedCells.add(this.getCellKey(this.playerGridPos.col, this.playerGridPos.row));
        this.refreshVisibility();
        this.centerViewportOnCell(this.playerGridPos.col, this.playerGridPos.row);
    }

    private readonly createWorldSeed = (): number => Math.floor(Math.random() * 0x7fffffff);

    private initializeFogOfWar(): void {
        this.fogStatesByIndex = new Array(this.grid.columns * this.grid.rows).fill(FOG_STATE.UNKNOWN);
        this.grid.forEachCell((_cell: GridCell, col: number, row: number) => {
            this.fogStates.set(this.getCellKey(col, row), FOG_STATE.UNKNOWN);
        });
    }

    private generateWorld(): void {
        this.generateTerrain();
        this.generateVillages();
        this.generateVillageRoadNetwork();
        this.pickRandomPlayerStart();
    }

    protected clearLocationFeaturesById(featureId: LocationFeatureId): void {
        this.locationFeatureIndexMap.forEach((features, index) => {
            if (!features.has(featureId)) {
                return;
            }
            features.delete(featureId);
            if (features.size === 0) {
                this.locationFeatureIndexMap.delete(index);
            } else {
                this.locationFeatureIndexMap.set(index, features);
            }
        });
    }

    protected clearAllLocationFeatures(): void {
        this.locationFeatureIndexMap.clear();
    }

    protected addLocationFeatureAt(col: number, row: number, featureId: LocationFeatureId): void {
        if (!this.grid.isValidPosition(col, row)) {
            return;
        }
        const index = this.getCellIndex(col, row);
        const features = this.locationFeatureIndexMap.get(index) ?? new Set<LocationFeatureId>();
        features.add(featureId);
        this.locationFeatureIndexMap.set(index, features);
    }

    protected hasLocationFeatureAt(col: number, row: number, featureId: LocationFeatureId): boolean {
        if (!this.grid.isValidPosition(col, row)) {
            return false;
        }
        return this.locationFeatureIndexMap.get(this.getCellIndex(col, row))?.has(featureId) ?? false;
    }

    protected getLocationFeatureCells(featureId: LocationFeatureId): number[] {
        const indexes: number[] = [];
        this.locationFeatureIndexMap.forEach((features, index) => {
            if (features.has(featureId)) {
                indexes.push(index);
            }
        });
        return indexes;
    }

    protected getLocationFeatureIdsAt(col: number, row: number): LocationFeatureId[] {
        if (!this.grid.isValidPosition(col, row)) {
            return [];
        }
        return Array.from(this.locationFeatureIndexMap.get(this.getCellIndex(col, row)) ?? []);
    }

}
