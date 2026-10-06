/* eslint-disable style-guide/function-length-warning, style-guide/rule17-comma-layout */
import { VillageRosterIntegrityError } from './VillageNpcRoster.js';

export default class VillageIntegrityAlert {
    private readonly modal: HTMLElement | null;
    private readonly shortMessage: HTMLElement | null;
    private readonly fullMessage: HTMLTextAreaElement | null;
    private readonly stackMessage: HTMLTextAreaElement | null;
    private readonly closeBtn: HTMLButtonElement | null;
    private readonly copyShortBtn: HTMLButtonElement | null;
    private readonly copyFullBtn: HTMLButtonElement | null;
    private readonly copyStackBtn: HTMLButtonElement | null;

    public constructor() {
        this.modal = this.getById('village-integrity-error-modal');
        this.shortMessage = this.getById('village-integrity-error-short');
        this.fullMessage = this.getById('village-integrity-error-full') as HTMLTextAreaElement | null;
        this.stackMessage = this.getById('village-integrity-error-stack') as HTMLTextAreaElement | null;
        this.closeBtn = this.getById('village-integrity-error-close-btn') as HTMLButtonElement | null;
        this.copyShortBtn = this.getById('village-integrity-copy-short-btn') as HTMLButtonElement | null;
        this.copyFullBtn = this.getById('village-integrity-copy-full-btn') as HTMLButtonElement | null;
        this.copyStackBtn = this.getById('village-integrity-copy-stack-btn') as HTMLButtonElement | null;

        this.closeBtn?.addEventListener('click', () => this.hide());
        this.copyShortBtn?.addEventListener('click', () => this.copyText(this.shortMessage?.textContent ?? ''));
        this.copyFullBtn?.addEventListener('click', () => this.copyText(this.fullMessage?.value ?? ''));
        this.copyStackBtn?.addEventListener('click', () => this.copyText(this.stackMessage?.value ?? ''));
    }

    public show(error: unknown, context: string): void {
        const normalized = this.normalizeError(error, context);
        if (!this.modal || !this.shortMessage || !this.fullMessage || !this.stackMessage) {
            console.error(normalized.fullMessage);
            if (normalized.stack) {
                console.error(normalized.stack);
            }
            return;
        }

        this.shortMessage.textContent = normalized.shortMessage;
        this.fullMessage.value = normalized.fullMessage;
        this.stackMessage.value = normalized.stack;
        this.modal.classList.remove('hidden');
    }

    private normalizeError(error: unknown, context: string): { shortMessage: string; fullMessage: string; stack: string } {
        if (error instanceof VillageRosterIntegrityError) {
            return {
                shortMessage: error.shortMessage,
                fullMessage: `${error.fullMessage}\nContext: ${context}`,
                stack: error.stack ?? '(no stack)',
            };
        }
        if (error instanceof Error) {
            return {
                shortMessage: error.message,
                fullMessage: `${error.name}: ${error.message}\nContext: ${context}`,
                stack: error.stack ?? '(no stack)',
            };
        }
        return {
            shortMessage: 'Unknown roster integrity error.',
            fullMessage: `Unknown roster integrity error in ${context}.\nValue: ${String(error)}`,
            stack: '(no stack)',
        };
    }

    private hide(): void {
        this.modal?.classList.add('hidden');
    }

    private async copyText(value: string): Promise<void> {
        if (!value.trim()) {
            return;
        }
        try {
            await navigator.clipboard?.writeText(value);
        } catch {
            // Swallow clipboard failures quietly.
        }
    }

    private getById(id: string): HTMLElement | null {
        if (typeof document === 'undefined' || typeof document.getElementById !== 'function') {
            return null;
        }
        return document.getElementById(id);
    }
}
