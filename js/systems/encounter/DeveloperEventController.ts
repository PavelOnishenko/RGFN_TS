/* eslint-disable style-guide/file-length-warning, style-guide/function-length-warning, style-guide/rule17-comma-layout */
import EncounterSystem, { ForcedEncounterType, RandomEncounterType } from './EncounterSystem.js';
import { MapDisplayConfig } from '../../types/game.js';
import DeveloperEncounterControls from './DeveloperEncounterControls.js';
import DeveloperNextCharacterRollControls from './DeveloperNextCharacterRollControls.js';
import DeveloperRandomAndMapControls from './DeveloperRandomAndMapControls.js';
import { DeveloperCallbacks, DeveloperUI, ENCOUNTER_LABELS } from './DeveloperEventTypes.js';
import { getDeveloperModeConfig, setDeveloperModeEnabled } from '../../utils/DeveloperModeConfig.js';

export default class DeveloperEventController {
    private developerUI: DeveloperUI;
    private encounterSystem: EncounterSystem;
    private callbacks: DeveloperCallbacks;
    private encounterControls: DeveloperEncounterControls;
    private nextCharacterRollControls: DeveloperNextCharacterRollControls;
    private randomAndMapControls: DeveloperRandomAndMapControls;
    private worldMapProfilingIntervalId: ReturnType<typeof setInterval> | null;
    private lastProfilingPayloadCacheKey: string;

    constructor(developerUI: DeveloperUI, encounterSystem: EncounterSystem, callbacks: DeveloperCallbacks) {
        this.developerUI = developerUI;
        this.encounterSystem = encounterSystem;
        this.callbacks = callbacks;
        this.encounterControls = new DeveloperEncounterControls(developerUI, encounterSystem, callbacks);
        this.nextCharacterRollControls = new DeveloperNextCharacterRollControls(developerUI, callbacks);
        this.randomAndMapControls = new DeveloperRandomAndMapControls(developerUI, callbacks);
        this.worldMapProfilingIntervalId = null;
        this.lastProfilingPayloadCacheKey = '';
        this.bindWorldMapProfilingPanelDrag();
        this.bindWorldInfoControls();
        this.renderWorldInfoOverview();
    }

    public toggleModal(forceVisible?: boolean): void {
        const shouldShow = typeof forceVisible === 'boolean'
            ? forceVisible
            : this.developerUI.modal.classList.contains('hidden');

        this.developerUI.modal.classList.toggle('hidden', !shouldShow);
        if (!shouldShow) {
            this.stopWorldMapProfilingAutoRefresh();
            return;
        }

        this.encounterControls.renderQueue();
        this.encounterControls.renderEncounterTypeControls();
        this.nextCharacterRollControls.renderNextCharacterRollSummary();
        this.randomAndMapControls.renderRandomProviderControls();
        this.randomAndMapControls.renderMapDisplayControls();
        this.developerUI.developerModeToggle.checked = getDeveloperModeConfig().enabled;
        this.developerUI.worldMapProfilingToggle.checked = this.callbacks.isWorldMapDrawProfilingEnabled();
        this.syncWorldMapRenderLayerTogglesFromMap();
        this.syncWorldMapRuntimeControlSelections();
        this.renderWorldMapProfilingPanel();
        this.renderWorldInfoOverview();
    }

    public applyDeveloperModeOnStartup(): void {
        this.applyDeveloperMode(getDeveloperModeConfig(), false);
    }

    public handleDeveloperModeToggle(enabled: boolean): void {
        const config = setDeveloperModeEnabled(enabled);
        this.applyDeveloperMode(config, true);
    }

    private applyDeveloperMode(config: ReturnType<typeof getDeveloperModeConfig>, logChanges: boolean): void {
        this.developerUI.developerModeToggle.checked = config.enabled;
        this.encounterSystem.setEncounterTypeEnabled('monster', config.encounterTypes.monster);
        this.encounterSystem.setEncounterTypeEnabled('item', config.encounterTypes.item);
        this.encounterSystem.setEncounterTypeEnabled('traveler', config.encounterTypes.traveler);
        this.callbacks.setMapDisplayConfig({ everythingDiscovered: config.everythingDiscovered, fogOfWar: config.fogOfWar });
        this.encounterControls.renderEncounterTypeControls();
        this.randomAndMapControls.renderMapDisplayControls();

        if (logChanges) {
            this.callbacks.addVillageLog(`[DEV] Persistent developer mode ${config.enabled ? 'enabled' : 'disabled'}.`, 'system');
        }
    }

    public handleQueueAdd(): void {
        const type = this.developerUI.eventType.value as ForcedEncounterType;
        this.encounterSystem.queueForcedEncounter(type);
        this.encounterControls.renderQueue();
        this.callbacks.addVillageLog(`[DEV] Queued event: ${this.callbacks.getEventLabel(type)}`, 'system');
    }

    public handleQueueClear(): void {
        this.encounterSystem.clearForcedEncounters();
        this.encounterControls.renderQueue();
    }

    public handleEncounterTypeToggle(type: RandomEncounterType, enabled: boolean): void {
        this.encounterSystem.setEncounterTypeEnabled(type, enabled);
        this.encounterControls.renderEncounterTypeControls();
        this.callbacks.addVillageLog(`[DEV] ${ENCOUNTER_LABELS[type]} encounters ${enabled ? 'enabled' : 'disabled'}.`, 'system');
    }

    public handleEncounterTypesToggleAll(enabled: boolean): void {
        this.encounterSystem.setAllEncounterTypesEnabled(enabled);
        this.encounterControls.renderEncounterTypeControls();
        this.callbacks.addVillageLog(`[DEV] ${enabled ? 'Enabled' : 'Disabled'} all random encounter types.`, 'system');
    }

    public toggleNextCharacterRollModal(forceVisible?: boolean): void {
        const shouldShow = typeof forceVisible === 'boolean'
            ? forceVisible
            : this.developerUI.nextRollModal.classList.contains('hidden');

        this.developerUI.nextRollModal.classList.toggle('hidden', !shouldShow);
        if (shouldShow) {
            this.nextCharacterRollControls.renderNextCharacterRollEditor();
        }
    }

    public handleNextCharacterRollInputChanged(): void {
        const allocation = this.nextCharacterRollControls.readInputs();
        this.nextCharacterRollControls.renderNextCharacterRollEditor(allocation);
    }

    public handleNextCharacterRollSave(): void {
        this.nextCharacterRollControls.saveFromInputs();
    }

    public handleNextCharacterRollClear(): void {
        this.nextCharacterRollControls.clearOverride();
    }

    public handleRandomSettingsInputChanged(): void {
        const settings = this.randomAndMapControls.readRandomSettingsInputs();
        this.randomAndMapControls.renderRandomProviderControls(settings, false);
    }

    public handleRandomSettingsApply(): void {
        this.randomAndMapControls.applyRandomSettings();
    }

    public handleMapDisplayToggle(setting: keyof MapDisplayConfig, enabled: boolean): void {
        this.randomAndMapControls.toggleMapDisplaySetting(setting, enabled);
    }

    public handleWorldMapDrawProfilingToggle(enabled: boolean): void {
        this.callbacks.setWorldMapDrawProfilingEnabled(enabled);
        if (enabled) {
            this.callbacks.resetWorldMapDrawProfiling();
            this.callbacks.addVillageLog('[DEV] World-map draw profiling enabled and reset.', 'system');
        } else {
            this.callbacks.addVillageLog('[DEV] World-map draw profiling disabled.', 'system');
        }
        this.renderWorldMapProfilingPanel();
    }

    public toggleWorldMapProfilingPanel(forceVisible?: boolean): void {
        const shouldShow = typeof forceVisible === 'boolean'
            ? forceVisible
            : this.developerUI.worldMapProfilingPanel.classList.contains('hidden');
        this.developerUI.worldMapProfilingPanel.classList.toggle('hidden', !shouldShow);
        if (!shouldShow) {
            this.stopWorldMapProfilingAutoRefresh();
            return;
        }
        this.ensureWorldMapProfilingPanelSpawnPosition();
        this.developerUI.worldMapProfilingToggle.checked = this.callbacks.isWorldMapDrawProfilingEnabled();
        this.syncWorldMapRenderLayerTogglesFromMap();
        this.syncWorldMapRuntimeControlSelections();
        this.renderWorldMapProfilingPanel();
    }

    public handleWorldMapProfilingRefresh(): void {
        this.renderWorldMapProfilingPanel();
    }

    public handleWorldMapProfilingAutoRefreshToggle(enabled: boolean): void {
        if (!enabled) {
            this.stopWorldMapProfilingAutoRefresh();
            this.renderWorldMapProfilingPanel();
            return;
        }
        this.startWorldMapProfilingAutoRefresh();
    }

    public handleWorldMapRenderLayerToggle(layer: 'terrain' | 'character' | 'locations' | 'roads' | 'selectionCursor', enabled: boolean): void {
        this.callbacks.setWorldMapRenderLayerToggles({ [layer]: enabled });
        this.callbacks.addVillageLog(`[DEV] World-map render layer "${layer}" ${enabled ? 'enabled' : 'disabled'}.`, 'system');
        this.renderWorldMapProfilingPanel();
    }

    public handleWorldMapRenderFpsCapChanged(cap: 'uncapped' | '60' | '30'): void {
        this.callbacks.setWorldMapRenderFpsCap(cap);
        this.renderWorldMapProfilingPanel();
    }

    public handleWorldMapDevicePixelRatioClampChanged(clamp: 'auto' | '1' | '1.5'): void {
        this.callbacks.setWorldMapDevicePixelRatioClamp(clamp);
        this.renderWorldMapProfilingPanel();
    }

    private startWorldMapProfilingAutoRefresh(): void {
        this.stopWorldMapProfilingAutoRefresh();
        this.worldMapProfilingIntervalId = setInterval(() => {
            this.renderWorldMapProfilingPanel();
        }, 750);
        this.renderWorldMapProfilingPanel();
    }

    private stopWorldMapProfilingAutoRefresh(): void {
        if (this.worldMapProfilingIntervalId !== null) {
            clearInterval(this.worldMapProfilingIntervalId);
            this.worldMapProfilingIntervalId = null;
            this.lastProfilingPayloadCacheKey = '';
        }
    }

    public renderWorldMapProfilingPanel(): void {
        const snapshot = this.callbacks.getWorldMapDrawProfilingSnapshot();
        const metrics = {
            ...this.callbacks.getWorldMapPerformanceSnapshot(),
            ...this.callbacks.getWorldMapPointerSnapshot(),
        };
        const payload = {
            profilingEnabled: this.callbacks.isWorldMapDrawProfilingEnabled(),
            renderLayers: this.callbacks.getWorldMapRenderLayerToggles(),
            renderFpsCap: this.callbacks.getWorldMapRenderFpsCap(),
            devicePixelRatioClamp: this.callbacks.getWorldMapDevicePixelRatioClamp(),
            metrics,
            sections: snapshot,
        };
        const cacheKey = JSON.stringify(payload);
        if (cacheKey === this.lastProfilingPayloadCacheKey) {
            return;
        }
        this.lastProfilingPayloadCacheKey = cacheKey;
        this.developerUI.worldMapProfilingOutput.textContent = JSON.stringify({
            ...payload,
            capturedAt: new Date().toISOString(),
        }, null, 2);
    }

    public renderWorldInfoOverview(): void {
        const overview = this.callbacks.getWorldSimulationOverview();
        const persistence = this.callbacks.getPersistenceOverview();
        this.developerUI.worldInfoOverviewOutput.textContent = JSON.stringify({
            worldTick: overview.worldTick,
            lastDelta: overview.lastDelta,
            pendingEvents: overview.pendingEvents,
            pendingEventsCount: overview.pendingEvents.length,
            persistence: {
                key: persistence.key,
                version: persistence.version,
                loadedVersion: persistence.loadedVersion,
                snapshotHash: persistence.snapshotHash,
                lastSavedAt: persistence.lastSavedAt,
                lastLoadedAt: persistence.lastLoadedAt,
            },
            capturedAt: new Date().toISOString(),
        }, null, 2);
    }

    private syncWorldMapRenderLayerTogglesFromMap(): void {
        const toggles = this.callbacks.getWorldMapRenderLayerToggles();
        this.developerUI.worldMapProfilingRenderLayerToggles.terrain.checked = toggles.terrain;
        this.developerUI.worldMapProfilingRenderLayerToggles.character.checked = toggles.character;
        this.developerUI.worldMapProfilingRenderLayerToggles.locations.checked = toggles.locations;
        this.developerUI.worldMapProfilingRenderLayerToggles.roads.checked = toggles.roads;
        this.developerUI.worldMapProfilingRenderLayerToggles.selectionCursor.checked = toggles.selectionCursor;
    }

    private syncWorldMapRuntimeControlSelections(): void {
        this.developerUI.worldMapProfilingFpsCapSelect.value = this.callbacks.getWorldMapRenderFpsCap();
        this.developerUI.worldMapProfilingDevicePixelRatioClampSelect.value = this.callbacks.getWorldMapDevicePixelRatioClamp();
    }

    private ensureWorldMapProfilingPanelSpawnPosition(): void {
        const panel = this.developerUI.worldMapProfilingPanel;
        if (panel.dataset.spawnPositioned === 'true') {
            return;
        }
        panel.dataset.offsetX = '28';
        panel.dataset.offsetY = '120';
        panel.dataset.spawnPositioned = 'true';
        panel.style.setProperty('--panel-offset-x', '28px');
        panel.style.setProperty('--panel-offset-y', '120px');
    }

    private bindWorldMapProfilingPanelDrag(): void {
        const panel = this.developerUI.worldMapProfilingPanel;
        const dragHandles = [
            this.developerUI.worldMapProfilingDragHandle,
            this.developerUI.worldMapProfilingCornerDragHandle,
        ];
        dragHandles.forEach((dragHandle) => {
            dragHandle.addEventListener('pointerdown', (event: PointerEvent) => this.handleProfilingPanelPointerDown(event, panel, dragHandle));
        });
    }

    private bindWorldInfoControls(): void {
        document.getElementById('toggle-world-info-panel-btn')?.addEventListener('click', () => this.renderWorldInfoOverview());
    }

    private handleProfilingPanelPointerDown(event: PointerEvent, panel: HTMLElement, dragHandle: HTMLElement): void {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        panel.style.zIndex = '35';
        panel.classList.add('panel-dragging');
        const startX = event.clientX;
        const startY = event.clientY;
        const initialOffsetX = Number.parseFloat(panel.dataset.offsetX ?? '0') || 0;
        const initialOffsetY = Number.parseFloat(panel.dataset.offsetY ?? '0') || 0;
        const pointerId = event.pointerId;
        if (typeof dragHandle.setPointerCapture === 'function') {
            dragHandle.setPointerCapture(pointerId);
        }
        const onPointerMove = (moveEvent: PointerEvent): void => this.updateProfilingPanelOffset(panel, startX, startY, initialOffsetX, initialOffsetY, moveEvent);
        const onPointerUp = (): void => this.finishProfilingPanelDrag(panel, dragHandle, pointerId, onPointerMove, onPointerUp);
        dragHandle.addEventListener('pointermove', onPointerMove);
        dragHandle.addEventListener('pointerup', onPointerUp);
        dragHandle.addEventListener('pointercancel', onPointerUp);
    }

    private updateProfilingPanelOffset(
        panel: HTMLElement,
        startX: number,
        startY: number,
        initialOffsetX: number,
        initialOffsetY: number,
        moveEvent: PointerEvent,
    ): void {
        const nextOffsetX = initialOffsetX + (moveEvent.clientX - startX);
        const nextOffsetY = initialOffsetY + (moveEvent.clientY - startY);
        panel.dataset.offsetX = String(nextOffsetX);
        panel.dataset.offsetY = String(nextOffsetY);
        panel.style.setProperty('--panel-offset-x', `${nextOffsetX}px`);
        panel.style.setProperty('--panel-offset-y', `${nextOffsetY}px`);
    }

    private finishProfilingPanelDrag(
        panel: HTMLElement,
        dragHandle: HTMLElement,
        pointerId: number,
        onPointerMove: (event: PointerEvent) => void,
        onPointerUp: () => void,
    ): void {
        panel.classList.remove('panel-dragging');
        if (typeof dragHandle.releasePointerCapture === 'function') {
            dragHandle.releasePointerCapture(pointerId);
        }
        dragHandle.removeEventListener('pointermove', onPointerMove);
        dragHandle.removeEventListener('pointerup', onPointerUp);
        dragHandle.removeEventListener('pointercancel', onPointerUp);
    }

    public renderQueue(): void {
        this.encounterControls.renderQueue();
    }
}
