import {
    configureGameRandomProvider,
    getGameRandomProviderSettings,
    getNormalizedPseudoRandomSeed,
    RandomProviderMode,
} from '../../utils/RandomProvider.js';
import { MapDisplayConfig } from '../../types/game.js';
import { DeveloperCallbacks, DeveloperUI } from './DeveloperEventTypes.js';

type RandomSettings = { mode: RandomProviderMode; pseudoSeed: string; activeSeed: string };

export default class DeveloperRandomAndMapControls {
    private developerUI: DeveloperUI;
    private callbacks: DeveloperCallbacks;

    constructor(developerUI: DeveloperUI, callbacks: DeveloperCallbacks) {
        this.developerUI = developerUI;
        this.callbacks = callbacks;
    }

    public renderRandomProviderControls(settings = getGameRandomProviderSettings(), wasApplied = false): void {
        const normalizedSeed = getNormalizedPseudoRandomSeed(settings.pseudoSeed);
        this.developerUI.randomModeSelect.value = settings.mode;
        this.developerUI.randomSeedInput.value = normalizedSeed;
        this.developerUI.randomSeedInput.disabled = settings.mode !== 'pseudo';
        this.developerUI.randomSummary.textContent = this.createSummary(settings.mode, normalizedSeed, settings.activeSeed);
        this.setRandomStatus(this.getStatusMessage(settings.mode, normalizedSeed, settings.activeSeed, wasApplied), false);
    }

    public readRandomSettingsInputs(): RandomSettings {
        const mode = this.developerUI.randomModeSelect.value === 'pseudo' ? 'pseudo' : 'true';
        const pseudoSeed = getNormalizedPseudoRandomSeed(this.developerUI.randomSeedInput.value);
        const current = getGameRandomProviderSettings();
        return { mode, pseudoSeed, activeSeed: current.activeSeed };
    }

    public applyRandomSettings(): void {
        const settings = this.readRandomSettingsInputs();
        const configured = configureGameRandomProvider(settings.mode, settings.pseudoSeed);
        this.renderRandomProviderControls(configured, true);
        this.callbacks.addVillageLog(`[DEV] Random provider set to ${this.describeForLog(configured)}.`, 'system');
    }

    public renderMapDisplayControls(): void {
        const config = this.callbacks.getMapDisplayConfig();
        this.developerUI.everythingDiscoveredToggle.checked = config.everythingDiscovered;
        this.developerUI.fogOfWarToggle.checked = config.fogOfWar;
    }

    public toggleMapDisplaySetting(setting: keyof MapDisplayConfig, enabled: boolean): void {
        this.callbacks.setMapDisplayConfig({ [setting]: enabled });
        this.renderMapDisplayControls();

        const label = setting === 'everythingDiscovered' ? 'Everything discovered' : 'Fog of war';
        this.callbacks.addVillageLog(`[DEV] ${label} ${enabled ? 'enabled' : 'disabled'}.`, 'system');
    }

    private createSummary(mode: RandomProviderMode, pseudoSeed: string, activeSeed: string): string {
        if (mode === 'pseudo') {
            return `Random provider: pseudo random. Seed = "${pseudoSeed}". Restart with New Character to reproduce the exact same run.`;
        }

        return `Random provider: true random. Current runtime seed = "${activeSeed}".`;
    }

    private getStatusMessage(mode: RandomProviderMode, pseudoSeed: string, activeSeed: string, wasApplied: boolean): string {
        if (wasApplied && mode === 'pseudo') {
            return `Pseudo-random seed "${pseudoSeed}" applied. Use New Character to replay the same sequence from the beginning.`;
        }

        if (wasApplied) {
            return `True-random runtime seed refreshed to "${activeSeed}".`;
        }

        if (mode === 'pseudo') {
            return 'Pseudo mode keeps every random roll deterministic for the same seed, including after New Character reloads.';
        }

        return 'True mode creates a fresh runtime seed every time you apply settings or reload the game.';
    }

    private describeForLog(settings: RandomSettings): string {
        if (settings.mode === 'pseudo') {
            return `pseudo random (seed: ${getNormalizedPseudoRandomSeed(settings.pseudoSeed)})`;
        }

        return `true random (runtime seed: ${settings.activeSeed})`;
    }

    private setRandomStatus(message: string, isError: boolean): void {
        this.developerUI.randomStatus.textContent = message;
        this.developerUI.randomStatus.classList.toggle('dev-events-status-error', isError);
    }
}
