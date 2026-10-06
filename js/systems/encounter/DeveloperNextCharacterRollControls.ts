import { balanceConfig } from '../../config/balance/balanceConfig.js';
import {
    clearNextCharacterRollAllocation,
    createEmptyNextCharacterRollAllocation,
    getNextCharacterRollAllocationTotal,
    getPlayerStats,
    loadNextCharacterRollAllocation,
    normalizeNextCharacterRollAllocation,
    saveNextCharacterRollAllocation,
    summarizeNextCharacterRollAllocation,
} from '../../utils/NextCharacterRollConfig.js';
import { DeveloperCallbacks, DeveloperUI } from './DeveloperEventTypes.js';

type NextCharacterAllocation = ReturnType<typeof createEmptyNextCharacterRollAllocation>;

export default class DeveloperNextCharacterRollControls {
    private developerUI: DeveloperUI;
    private callbacks: DeveloperCallbacks;

    constructor(developerUI: DeveloperUI, callbacks: DeveloperCallbacks) {
        this.developerUI = developerUI;
        this.callbacks = callbacks;
    }

    public renderNextCharacterRollSummary(): void {
        const allocation = loadNextCharacterRollAllocation();
        const expectedTotal = this.getExpectedTotal();
        if (!allocation) {
            this.developerUI.nextRollSummary.textContent = `Next character roll: random (${expectedTotal} points).`;
            return;
        }

        const summary = summarizeNextCharacterRollAllocation(allocation);
        const total = getNextCharacterRollAllocationTotal(allocation);
        this.developerUI.nextRollSummary.textContent = `Next character roll: ${summary} (${total}/${expectedTotal} points).`;
    }

    public renderNextCharacterRollEditor(
        allocation = loadNextCharacterRollAllocation() ?? createEmptyNextCharacterRollAllocation(),
    ): void {
        const normalized = normalizeNextCharacterRollAllocation(allocation);
        const total = getNextCharacterRollAllocationTotal(normalized);
        const expectedTotal = this.getExpectedTotal();

        this.writeInputs(normalized);
        this.developerUI.nextRollTotal.textContent = `${total} / ${expectedTotal}`;
        this.setStatus(this.getStatusMessage(total, expectedTotal), total !== expectedTotal);
    }

    public readInputs(): NextCharacterAllocation {
        const allocation = createEmptyNextCharacterRollAllocation();
        getPlayerStats().forEach((stat) => {
            const inputValue = this.developerUI.nextRollInputs[stat].value || '0';
            const value = Number.parseInt(inputValue, 10) || 0;
            allocation[stat] = Math.max(0, Math.floor(value));
        });
        return allocation;
    }

    public saveFromInputs(): boolean {
        const allocation = this.readInputs();
        const total = getNextCharacterRollAllocationTotal(allocation);
        const expectedTotal = this.getExpectedTotal();
        if (total !== expectedTotal) {
            this.setStatus(`Allocate exactly ${expectedTotal} points before saving.`, true);
            return false;
        }

        saveNextCharacterRollAllocation(allocation);
        this.setStatus('Next new character roll saved.', false);
        this.renderNextCharacterRollSummary();
        this.callbacks.addVillageLog(`[DEV] Next character roll saved: ${summarizeNextCharacterRollAllocation(allocation)}`, 'system');
        return true;
    }

    public clearOverride(): void {
        clearNextCharacterRollAllocation();
        const emptyAllocation = createEmptyNextCharacterRollAllocation();
        this.writeInputs(emptyAllocation);
        this.renderNextCharacterRollEditor(emptyAllocation);
        this.renderNextCharacterRollSummary();
        this.callbacks.addVillageLog('[DEV] Cleared next character roll override.', 'system');
    }

    private writeInputs(allocation: NextCharacterAllocation): void {
        getPlayerStats().forEach((stat) => {
            this.developerUI.nextRollInputs[stat].value = String(allocation[stat]);
        });
    }

    private getExpectedTotal = (): number => Math.max(0, balanceConfig.player.initialRandomAllocatedSkillPoints ?? 0);

    private getStatusMessage(total: number, expectedTotal: number): string {
        if (total === expectedTotal) {
            return 'Saved setup will be consumed by the next new character only.';
        }

        return `Allocate exactly ${expectedTotal} points to save this roll.`;
    }

    private setStatus(message: string, isError: boolean): void {
        this.developerUI.nextRollStatus.textContent = message;
        this.developerUI.nextRollStatus.classList.toggle('dev-events-status-error', isError);
    }
}
