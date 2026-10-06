import { ForcedEncounterType, RandomEncounterType } from './EncounterSystem.js';
import { MapDisplayConfig } from '../../types/game.js';

export type DeveloperUI = {
    modal: HTMLElement;
    eventType: HTMLSelectElement;
    queueList: HTMLElement;
    encounterTypeSummary: HTMLElement;
    encounterTypeToggles: Record<RandomEncounterType, HTMLInputElement>;
    nextRollSummary: HTMLElement;
    nextRollModal: HTMLElement;
    nextRollTotal: HTMLElement;
    nextRollStatus: HTMLElement;
    nextRollInputs: Record<'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence', HTMLInputElement>;
    randomModeSelect: HTMLSelectElement;
    randomSeedInput: HTMLInputElement;
    randomSummary: HTMLElement;
    randomStatus: HTMLElement;
    randomApplyBtn: HTMLButtonElement;
    developerModeToggle: HTMLInputElement;
    everythingDiscoveredToggle: HTMLInputElement;
    fogOfWarToggle: HTMLInputElement;
    worldMapProfilingToggle: HTMLInputElement;
    worldMapProfilingOpenBtn: HTMLButtonElement;
    worldMapProfilingPanel: HTMLElement;
    worldMapProfilingDragHandle: HTMLElement;
    worldMapProfilingCornerDragHandle: HTMLElement;
    worldMapProfilingCloseBtn: HTMLButtonElement;
    worldMapProfilingRefreshBtn: HTMLButtonElement;
    worldMapProfilingAutoRefreshToggle: HTMLInputElement;
    worldMapProfilingRenderLayerToggles: {
        terrain: HTMLInputElement;
        character: HTMLInputElement;
        locations: HTMLInputElement;
        roads: HTMLInputElement;
        selectionCursor: HTMLInputElement;
    };
    worldMapProfilingFpsCapSelect: HTMLSelectElement;
    worldMapProfilingDevicePixelRatioClampSelect: HTMLSelectElement;
    worldMapProfilingOutput: HTMLElement;
    worldInfoOverviewOutput: HTMLElement;
};

export type WorldMapDrawProfilingSnapshot = Record<string, { frames: number; avgMs: number; maxMs: number; lastFrameMs: number }>;

export type DeveloperCallbacks = {
    addVillageLog: (message: string, type?: string) => void;
    getEventLabel: (type: ForcedEncounterType) => string;
    getMapDisplayConfig: () => MapDisplayConfig;
    setMapDisplayConfig: (config: Partial<MapDisplayConfig>) => void;
    setWorldMapDrawProfilingEnabled: (enabled: boolean) => void;
    isWorldMapDrawProfilingEnabled: () => boolean;
    resetWorldMapDrawProfiling: () => void;
    getWorldMapDrawProfilingSnapshot: () => WorldMapDrawProfilingSnapshot;
    setWorldMapRenderLayerToggles: (toggles: Partial<{
        terrain: boolean;
        character: boolean;
        locations: boolean;
        roads: boolean;
        selectionCursor: boolean;
    }>) => void;
    getWorldMapRenderLayerToggles: () => {
        terrain: boolean;
        character: boolean;
        locations: boolean;
        roads: boolean;
        selectionCursor: boolean;
    };
    getWorldMapPerformanceSnapshot: () => Record<string, unknown>;
    getWorldMapPointerSnapshot: () => { rawMouseMoveEventsPerSecond: number; hoverTileChangesPerSecond: number };
    setWorldMapRenderFpsCap: (cap: 'uncapped' | '60' | '30') => void;
    getWorldMapRenderFpsCap: () => 'uncapped' | '60' | '30';
    setWorldMapDevicePixelRatioClamp: (clamp: 'auto' | '1' | '1.5') => void;
    getWorldMapDevicePixelRatioClamp: () => 'auto' | '1' | '1.5';
    getWorldSimulationOverview: () => { worldTick: number; lastDelta: number; pendingEvents: string[] };
    getPersistenceOverview: () => {
        key: string;
        version: number;
        loadedVersion: number | null;
        snapshotHash: string | null;
        lastSavedAt: string | null;
        lastLoadedAt: string | null;
    };
};

export const ENCOUNTER_LABELS: Record<RandomEncounterType, string> = { monster: 'Monster', item: 'Item', traveler: 'Traveler' };
