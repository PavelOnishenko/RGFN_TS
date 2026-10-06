import { theme } from '../../../config/ThemeConfig.js';

type QuestUiFeedbackPresenterDependencies = {
    containers: HTMLElement[];
};

export default class QuestUiFeedbackPresenter {
    public readonly feedbackElements: HTMLElement[];
    private feedbackClearTimeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor(dependencies: QuestUiFeedbackPresenterDependencies) {
        this.feedbackElements = dependencies.containers.map((container) => this.createFeedbackElement(container));
    }

    public setFeedback(message: string, isError: boolean): void {
        this.clearScheduledFeedbackReset();
        for (const element of this.feedbackElements) {
            element.textContent = message;
            element.classList.toggle('is-error', isError);
        }

        const feedbackDurationMs = Math.max(0, theme.quest.feedbackMessageDurationMs);
        if (feedbackDurationMs === 0) {
            this.clearFeedback();
            return;
        }

        this.feedbackClearTimeoutId = setTimeout(() => {
            this.clearFeedback();
            this.feedbackClearTimeoutId = null;
        }, feedbackDurationMs);
    }

    private createFeedbackElement(container: HTMLElement): HTMLElement {
        if (typeof document !== 'undefined' && typeof container.insertAdjacentElement === 'function') {
            const feedback = document.createElement('div');
            feedback.className = 'quest-feedback';
            container.insertAdjacentElement('afterend', feedback);
            return feedback;
        }

        const feedback = { textContent: '', className: 'quest-feedback', classList: { toggle() { /* noop in tests */ } } } as unknown as HTMLElement;
        return feedback;
    }

    private clearScheduledFeedbackReset(): void {
        if (this.feedbackClearTimeoutId === null) {
            return;
        }

        clearTimeout(this.feedbackClearTimeoutId);
        this.feedbackClearTimeoutId = null;
    }

    private clearFeedback(): void {
        for (const element of this.feedbackElements) {
            element.textContent = '';
            element.classList.toggle('is-error', false);
        }
    }
}
