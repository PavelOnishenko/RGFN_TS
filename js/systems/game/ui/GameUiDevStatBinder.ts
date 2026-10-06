import DeveloperEventController from '../../encounter/DeveloperEventController.js';
import { RandomEncounterType } from '../../encounter/EncounterSystem.js';
import { DeveloperUI, HudElements } from './GameUiTypes.js';
import { GameUiEventCallbacks } from './GameUiEventBinderTypes.js';

export default class GameUiDevStatBinder {
    private hudElements: HudElements;
    private developerUI: DeveloperUI;
    private developerEventController: DeveloperEventController;
    private callbacks: GameUiEventCallbacks;

    constructor(hudElements: HudElements, developerUI: DeveloperUI, developerEventController: DeveloperEventController, callbacks: GameUiEventCallbacks) {
        this.hudElements = hudElements;
        this.developerUI = developerUI;
        this.developerEventController = developerEventController;
        this.callbacks = callbacks;
    }

    public bind(): void {
        this.bindDeveloperEvents();
        this.bindStatEvents();
    }

    // eslint-disable-next-line style-guide/function-length-warning
    private bindDeveloperEvents(): void {
        this.developerUI.addBtn.addEventListener('click', () => this.developerEventController.handleQueueAdd());
        this.developerUI.clearBtn.addEventListener('click', () => this.developerEventController.handleQueueClear());
        this.developerUI.closeBtn.addEventListener('click', () => this.developerEventController.toggleModal(false));
        this.bindEncounterTypeToggleEvents();
        this.developerUI.nextRollOpenBtn.addEventListener('click', () => this.developerEventController.toggleNextCharacterRollModal(true));
        this.developerUI.nextRollCloseBtn.addEventListener('click', () => this.developerEventController.toggleNextCharacterRollModal(false));
        this.developerUI.nextRollSaveBtn.addEventListener('click', () => this.developerEventController.handleNextCharacterRollSave());
        this.developerUI.nextRollClearBtn.addEventListener('click', () => this.developerEventController.handleNextCharacterRollClear());
        this.developerUI.randomModeSelect.addEventListener('change', () => this.developerEventController.handleRandomSettingsInputChanged());
        this.developerUI.randomSeedInput.addEventListener('input', () => this.developerEventController.handleRandomSettingsInputChanged());
        this.developerUI.randomApplyBtn.addEventListener('click', () => this.developerEventController.handleRandomSettingsApply());
        this.developerUI.developerModeToggle.addEventListener('change', () => this.developerEventController.handleDeveloperModeToggle(this.developerUI.developerModeToggle.checked));
        this.developerUI.everythingDiscoveredToggle.addEventListener('change', () => this.handleMapDisplayToggle('everythingDiscovered'));
        this.developerUI.fogOfWarToggle.addEventListener('change', () => this.handleMapDisplayToggle('fogOfWar'));
        this.developerUI.worldMapProfilingOpenBtn.addEventListener('click', () => this.developerEventController.toggleWorldMapProfilingPanel(true));
        this.developerUI.worldMapProfilingCloseBtn.addEventListener('click', () => this.developerEventController.toggleWorldMapProfilingPanel(false));
        this.developerUI.worldMapProfilingToggle.addEventListener('change', () => this.developerEventController.handleWorldMapDrawProfilingToggle(this.developerUI.worldMapProfilingToggle.checked));
        this.developerUI.worldMapProfilingRefreshBtn.addEventListener('click', () => this.developerEventController.handleWorldMapProfilingRefresh());
        this.developerUI.worldMapProfilingAutoRefreshToggle.addEventListener('change', () => this.developerEventController.handleWorldMapProfilingAutoRefreshToggle(this.developerUI.worldMapProfilingAutoRefreshToggle.checked));
        this.developerUI.worldMapProfilingFpsCapSelect.addEventListener('change', () => this.developerEventController.handleWorldMapRenderFpsCapChanged(this.developerUI.worldMapProfilingFpsCapSelect.value as 'uncapped' | '60' | '30'));
        this.developerUI.worldMapProfilingDevicePixelRatioClampSelect.addEventListener('change', () => this.developerEventController.handleWorldMapDevicePixelRatioClampChanged(this.developerUI.worldMapProfilingDevicePixelRatioClampSelect.value as 'auto' | '1' | '1.5'));
        this.bindWorldMapRenderLayerToggleEvents();
        Object.values(this.developerUI.nextRollInputs).forEach((input) => {
            input.addEventListener('input', () => this.developerEventController.handleNextCharacterRollInputChanged());
        });
        this.developerUI.modal.addEventListener('click', (event: MouseEvent) => this.closeDeveloperModal(event));
        this.developerUI.nextRollModal.addEventListener('click', (event: MouseEvent) => this.closeNextRollModal(event));
    }

    private bindEncounterTypeToggleEvents(): void {
        this.developerUI.enableAllEncountersBtn.addEventListener('click', () => this.developerEventController.handleEncounterTypesToggleAll(true));
        this.developerUI.disableAllEncountersBtn.addEventListener('click', () => this.developerEventController.handleEncounterTypesToggleAll(false));
        Object.entries(this.developerUI.encounterTypeToggles).forEach(([type, input]) => {
            input.addEventListener('change', () => this.developerEventController.handleEncounterTypeToggle(type as RandomEncounterType, input.checked));
        });
    }

    private bindWorldMapRenderLayerToggleEvents(): void {
        const toggles = this.developerUI.worldMapProfilingRenderLayerToggles;
        toggles.terrain.addEventListener('change', () => this.developerEventController.handleWorldMapRenderLayerToggle('terrain', toggles.terrain.checked));
        toggles.character.addEventListener('change', () => this.developerEventController.handleWorldMapRenderLayerToggle('character', toggles.character.checked));
        toggles.locations.addEventListener('change', () => this.developerEventController.handleWorldMapRenderLayerToggle('locations', toggles.locations.checked));
        toggles.roads.addEventListener('change', () => this.developerEventController.handleWorldMapRenderLayerToggle('roads', toggles.roads.checked));
        toggles.selectionCursor.addEventListener('change', () => this.developerEventController.handleWorldMapRenderLayerToggle('selectionCursor', toggles.selectionCursor.checked));
    }

    private handleMapDisplayToggle(type: 'everythingDiscovered' | 'fogOfWar'): void {
        const toggle = type === 'everythingDiscovered' ? this.developerUI.everythingDiscoveredToggle : this.developerUI.fogOfWarToggle;
        this.developerEventController.handleMapDisplayToggle(type, toggle.checked);
    }

    private closeDeveloperModal(event: MouseEvent): void {
        if (event.target === this.developerUI.modal) {
            this.developerEventController.toggleModal(false);
        }
    }

    private closeNextRollModal(event: MouseEvent): void {
        if (event.target === this.developerUI.nextRollModal) {
            this.developerEventController.toggleNextCharacterRollModal(false);
        }
    }

    // eslint-disable-next-line style-guide/function-length-warning
    private bindStatEvents(): void {
        this.hudElements.addVitalityBtn.addEventListener('click', () => this.callbacks.onAddStat('vitality'));
        this.hudElements.addToughnessBtn.addEventListener('click', () => this.callbacks.onAddStat('toughness'));
        this.hudElements.addStrengthBtn.addEventListener('click', () => this.callbacks.onAddStat('strength'));
        this.hudElements.addAgilityBtn.addEventListener('click', () => this.callbacks.onAddStat('agility'));
        this.hudElements.addConnectionBtn.addEventListener('click', () => this.callbacks.onAddStat('connection'));
        this.hudElements.addIntelligenceBtn.addEventListener('click', () => this.callbacks.onAddStat('intelligence'));
        this.hudElements.subVitalityBtn.addEventListener('click', () => this.callbacks.onRemoveStat('vitality'));
        this.hudElements.subToughnessBtn.addEventListener('click', () => this.callbacks.onRemoveStat('toughness'));
        this.hudElements.subStrengthBtn.addEventListener('click', () => this.callbacks.onRemoveStat('strength'));
        this.hudElements.subAgilityBtn.addEventListener('click', () => this.callbacks.onRemoveStat('agility'));
        this.hudElements.subConnectionBtn.addEventListener('click', () => this.callbacks.onRemoveStat('connection'));
        this.hudElements.subIntelligenceBtn.addEventListener('click', () => this.callbacks.onRemoveStat('intelligence'));
        this.hudElements.saveSkillsBtn.addEventListener('click', () => this.callbacks.onSaveSkillChanges());
        this.hudElements.godSkillsBtn.addEventListener('click', () => this.callbacks.onGodSkillsBoost());
        this.hudElements.upgradeFireballBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('fireball'));
        this.hudElements.upgradeCurseBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('curse'));
        this.hudElements.upgradeSlowBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('slow'));
        this.hudElements.upgradeRageBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('rage'));
        this.hudElements.upgradeArcaneLanceBtn.addEventListener('click', () => this.callbacks.onUpgradeSpell('arcane-lance'));
    }
}
