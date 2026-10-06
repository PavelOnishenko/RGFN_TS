import type { RandomEncounterType } from '../../encounter/EncounterSystem.js';
import type { BattleUI, VillageUI, WorldUI } from './GameUiSceneModels.js';
import type { HudElements } from './GameUiHudElementsModel.js';

export class DeveloperUiModel {
    public modal!: HTMLElement;
    public closeBtn!: HTMLButtonElement;
    public eventType!: HTMLSelectElement;
    public queueList!: HTMLElement;
    public addBtn!: HTMLButtonElement;
    public clearBtn!: HTMLButtonElement;
    public encounterTypeSummary!: HTMLElement;
    public enableAllEncountersBtn!: HTMLButtonElement;
    public disableAllEncountersBtn!: HTMLButtonElement;
    public encounterTypeToggles!: Record<RandomEncounterType, HTMLInputElement>;
    public nextRollOpenBtn!: HTMLButtonElement;
    public nextRollSummary!: HTMLElement;
    public nextRollModal!: HTMLElement;
    public nextRollCloseBtn!: HTMLButtonElement;
    public nextRollTotal!: HTMLElement;
    public nextRollStatus!: HTMLElement;
    public nextRollSaveBtn!: HTMLButtonElement;
    public nextRollClearBtn!: HTMLButtonElement;
    public nextRollInputs!: Record<'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence', HTMLInputElement>;
    public randomModeSelect!: HTMLSelectElement;
    public randomSeedInput!: HTMLInputElement;
    public randomSummary!: HTMLElement;
    public randomStatus!: HTMLElement;
    public randomApplyBtn!: HTMLButtonElement;
    public developerModeToggle!: HTMLInputElement;
    public everythingDiscoveredToggle!: HTMLInputElement;
    public fogOfWarToggle!: HTMLInputElement;
    public worldMapProfilingToggle!: HTMLInputElement;
    public worldMapProfilingOpenBtn!: HTMLButtonElement;
    public worldMapProfilingPanel!: HTMLElement;
    public worldMapProfilingDragHandle!: HTMLElement;
    public worldMapProfilingCornerDragHandle!: HTMLElement;
    public worldMapProfilingCloseBtn!: HTMLButtonElement;
    public worldMapProfilingRefreshBtn!: HTMLButtonElement;
    public worldMapProfilingAutoRefreshToggle!: HTMLInputElement;
    public worldMapProfilingRenderLayerToggles!: {
        terrain: HTMLInputElement;
        character: HTMLInputElement;
        locations: HTMLInputElement;
        roads: HTMLInputElement;
        selectionCursor: HTMLInputElement;
    };
    public worldMapProfilingFpsCapSelect!: HTMLSelectElement;
    public worldMapProfilingDevicePixelRatioClampSelect!: HTMLSelectElement;
    public worldMapProfilingOutput!: HTMLElement;
    public worldInfoOverviewOutput!: HTMLElement;
}

export type DeveloperUI = DeveloperUiModel;

export class GameLogUiModel {
    public log!: HTMLElement;
}

export type GameLogUI = GameLogUiModel;

export class GameUiBundleModel {
    public hudElements!: HudElements;
    public worldUI!: WorldUI;
    public battleUI!: BattleUI;
    public villageUI!: VillageUI;
    public gameLogUI!: GameLogUI;
    public developerUI!: DeveloperUI;
}

export type GameUiBundle = GameUiBundleModel;
