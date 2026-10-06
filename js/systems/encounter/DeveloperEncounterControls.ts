import EncounterSystem, { RANDOM_ENCOUNTER_TYPES, RandomEncounterType } from './EncounterSystem.js';
import { DeveloperCallbacks, DeveloperUI, ENCOUNTER_LABELS } from './DeveloperEventTypes.js';

export default class DeveloperEncounterControls {
    private developerUI: DeveloperUI;
    private encounterSystem: EncounterSystem;
    private callbacks: DeveloperCallbacks;

    constructor(developerUI: DeveloperUI, encounterSystem: EncounterSystem, callbacks: DeveloperCallbacks) {
        this.developerUI = developerUI;
        this.encounterSystem = encounterSystem;
        this.callbacks = callbacks;
    }

    public renderQueue(): void {
        const queue = this.encounterSystem.getForcedEncounterQueue();
        this.developerUI.queueList.innerHTML = '';
        if (queue.length === 0) {
            this.appendQueueItem('No queued events.');
            return;
        }

        queue.forEach((entry, index) => {
            this.appendQueueItem(`${index + 1}. ${this.callbacks.getEventLabel(entry)}`);
        });
    }

    public renderEncounterTypeControls(): void {
        const states = this.encounterSystem.getEncounterTypeStates();
        RANDOM_ENCOUNTER_TYPES.forEach((type) => {
            this.developerUI.encounterTypeToggles[type].checked = states[type];
        });

        this.developerUI.encounterTypeSummary.textContent = this.createEncounterSummary(states);
    }

    private appendQueueItem(text: string): void {
        const item = document.createElement('li');
        item.textContent = text;
        this.developerUI.queueList.appendChild(item);
    }

    private createEncounterSummary(states: Record<RandomEncounterType, boolean>): string {
        const enabledLabels = RANDOM_ENCOUNTER_TYPES
            .filter((type) => states[type])
            .map((type) => ENCOUNTER_LABELS[type]);

        if (enabledLabels.length === 0) {
            return 'Random encounters disabled. Forced queue still works.';
        }

        return `Enabled random encounters: ${enabledLabels.join(', ')}.`;
    }
}
