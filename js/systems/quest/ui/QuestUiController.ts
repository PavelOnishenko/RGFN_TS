/* eslint-disable style-guide/file-length-warning, style-guide/function-length-warning */
import { QuestNode } from '../QuestTypes.js';
import QuestUiMarkupBuilder from './QuestUiMarkupBuilder.js';
import QuestUiFeedbackPresenter from './QuestUiFeedbackPresenter.js';
const KNOWN_ONLY_TOGGLE_STORAGE_KEY = 'rgfn_quests_known_only_toggle_v1';
const KNOWN_ONLY_TOGGLE_DEFAULT = true;
const SIDE_STATUS_FILTER_STORAGE_KEY = 'rgfn_side_quests_status_filter_v1';
const MAIN_TOGGLE_LABEL = 'Show only known/current quests';
const SIDE_FILTER_BUTTON_LABEL_PREFIX = 'Filter statuses';
const SIDE_STATUS_ORDER = ['active', 'available', 'readyToTurnIn', 'completed'] as const;
const SIDE_STATUS_DEFAULT_FILTER = new Set<SideQuestStatus>(['active', 'readyToTurnIn', 'completed']);
type QuestTab = 'main' | 'side';
type SideQuestStatus = typeof SIDE_STATUS_ORDER[number];
type SideStatusFilterCheckboxes = Record<SideQuestStatus, HTMLInputElement>;
type QuestUiCallbacks = {
    onLocationClick: (locationName: string) => boolean;
    isDeveloperModeEnabled: () => boolean;
    onRegenerateSideQuest: (questId: string) => Promise<boolean>;
};
export default class QuestUiController {
    private readonly questTitle: HTMLElement;
    private readonly mainTabBtn: HTMLButtonElement;
    private readonly sideTabBtn: HTMLButtonElement;
    private readonly knownOnlyToggle: HTMLInputElement;
    private readonly modeToggleContainer: HTMLElement;
    private readonly modeToggleLabel: HTMLElement;
    private sideFilterContainer: HTMLElement;
    private sideFilterButton: HTMLButtonElement;
    private sideFilterPopup: HTMLElement;
    private sideFilterApplyButton: HTMLButtonElement;
    private sideStatusFilterCheckboxes: SideStatusFilterCheckboxes;
    private readonly questBody: HTMLElement;
    private readonly introModal: HTMLElement;
    private readonly introBody: HTMLElement;
    private readonly introCloseBtn: HTMLButtonElement;
    private readonly callbacks: QuestUiCallbacks;
    private readonly markupBuilder: QuestUiMarkupBuilder;
    private readonly feedbackPresenter: QuestUiFeedbackPresenter;
    private readonly feedbackElements: HTMLElement[];
    private lastRenderedQuest: QuestNode | null = null;
    private lastRenderedSideQuests: QuestNode[] = [];
    private activeTab: QuestTab = 'main';
    private mainKnownOnlyEnabled = KNOWN_ONLY_TOGGLE_DEFAULT;
    private sideStatusFilter: Set<SideQuestStatus> = new Set(SIDE_STATUS_DEFAULT_FILTER);
    constructor(
        questTitle: HTMLElement,
        mainTabBtn: HTMLButtonElement,
        sideTabBtn: HTMLButtonElement,
        knownOnlyToggle: HTMLInputElement,
        modeToggleContainer: HTMLElement,
        modeToggleLabel: HTMLElement,
        sideFilterContainer: HTMLElement,
        sideFilterButton: HTMLButtonElement,
        sideFilterPopup: HTMLElement,
        sideFilterApplyButton: HTMLButtonElement,
        sideStatusFilterCheckboxes: SideStatusFilterCheckboxes,
        questBody: HTMLElement,
        introModal: HTMLElement,
        introBody: HTMLElement,
        introCloseBtn: HTMLButtonElement,
        callbacks: QuestUiCallbacks,
    ) {
        this.questTitle = questTitle;
        this.mainTabBtn = mainTabBtn;
        this.sideTabBtn = sideTabBtn;
        this.knownOnlyToggle = knownOnlyToggle;
        this.modeToggleContainer = modeToggleContainer;
        this.modeToggleLabel = modeToggleLabel;
        this.assignSideFilterElements(sideFilterContainer, sideFilterButton, sideFilterPopup, sideFilterApplyButton, sideStatusFilterCheckboxes);
        this.questBody = questBody;
        this.introModal = introModal;
        this.introBody = introBody;
        this.introCloseBtn = introCloseBtn;
        this.callbacks = callbacks;
        this.markupBuilder = new QuestUiMarkupBuilder({ isKnownOnlyEnabled: () => this.mainKnownOnlyEnabled });
        this.feedbackPresenter = new QuestUiFeedbackPresenter({ containers: [this.questBody, this.introBody] });
        this.feedbackElements = this.feedbackPresenter.feedbackElements;
        this.introModal.classList.add('hidden');
        this.hideSideFilterPopup();
        this.switchTab('main');
        this.applyPersistedKnownOnlyState();
        this.bindEvents();
    }
    public renderQuest(quest: QuestNode, sideQuests: QuestNode[] = []): void {
        this.lastRenderedQuest = quest;
        this.lastRenderedSideQuests = sideQuests;
        const markup = this.markupBuilder.buildQuestTreeMarkup(quest);
        this.introBody.innerHTML = markup;
        this.renderCurrentTab();
    }
    public showIntro(): void {
        this.introModal.classList.remove('hidden');
    }
    private setFeedback(message: string, isError: boolean): void {
        this.feedbackPresenter.setFeedback(message, isError);
    }
    private bindEvents(): void {
        this.introCloseBtn.addEventListener('click', () => this.introModal.classList.add('hidden'));
        this.knownOnlyToggle.addEventListener('change', () => this.handleKnownOnlyToggleChange());
        this.sideFilterButton.addEventListener('click', () => this.handleSideFilterButtonClick());
        this.sideFilterApplyButton.addEventListener('click', () => this.handleSideFilterApplyClick());
        this.mainTabBtn.addEventListener('click', () => this.switchTab('main'));
        this.sideTabBtn.addEventListener('click', () => this.switchTab('side'));
        this.introModal.addEventListener('click', (event: MouseEvent) => this.handleIntroModalClick(event));
        this.questBody.addEventListener('click', (event: MouseEvent) => {
            void this.handleRegenerateButtonClick(event);
            this.handleLocationClick(event);
        });
        this.bindLocationClicks(this.introBody);
    }
    private assignSideFilterElements(
        sideFilterContainer: HTMLElement,
        sideFilterButton: HTMLButtonElement,
        sideFilterPopup: HTMLElement,
        sideFilterApplyButton: HTMLButtonElement,
        sideStatusFilterCheckboxes: SideStatusFilterCheckboxes,
    ): void {
        this.sideFilterContainer = sideFilterContainer;
        this.sideFilterButton = sideFilterButton;
        this.sideFilterPopup = sideFilterPopup;
        this.sideFilterApplyButton = sideFilterApplyButton;
        this.sideStatusFilterCheckboxes = sideStatusFilterCheckboxes;
    }
    private handleKnownOnlyToggleChange(): void {
        if (this.activeTab !== 'main') {
            return;
        }
        this.mainKnownOnlyEnabled = this.knownOnlyToggle.checked;
        this.persistKnownOnlyState();
        if (this.lastRenderedQuest) {
            this.renderCurrentTab();
        }
    }
    private handleIntroModalClick(event: MouseEvent): void {
        if (event.target === this.introModal) {
            this.introModal.classList.add('hidden');
        }
    }
    private applyPersistedKnownOnlyState(): void {
        this.mainKnownOnlyEnabled = this.readKnownOnlyState() ?? KNOWN_ONLY_TOGGLE_DEFAULT;
        this.sideStatusFilter = this.readSideStatusFilter();
        this.updateModeToggleUi();
    }
    private persistKnownOnlyState(): void {
        const storage = this.getLocalStorage();
        if (!storage) {
            return;
        }
        storage.setItem(KNOWN_ONLY_TOGGLE_STORAGE_KEY, this.knownOnlyToggle.checked ? '1' : '0');
    }
    private readKnownOnlyState(): boolean | null {
        const storage = this.getLocalStorage();
        if (!storage) {
            return null;
        }
        const rawValue = storage.getItem(KNOWN_ONLY_TOGGLE_STORAGE_KEY);
        if (rawValue === '1') {
            return true;
        }
        if (rawValue === '0') {
            return false;
        }
        return null;
    }
    private persistSideStatusFilter(): void {
        const storage = this.getLocalStorage();
        if (!storage) {
            return;
        }
        const serializedFilter = SIDE_STATUS_ORDER
            .filter((status) => this.sideStatusFilter.has(status))
            .join(',');
        storage.setItem(SIDE_STATUS_FILTER_STORAGE_KEY, serializedFilter);
    }
    private readSideStatusFilter(): Set<SideQuestStatus> {
        const storage = this.getLocalStorage();
        if (!storage) {
            return new Set(SIDE_STATUS_DEFAULT_FILTER);
        }
        const rawValue = storage.getItem(SIDE_STATUS_FILTER_STORAGE_KEY);
        if (!rawValue) {
            return new Set(SIDE_STATUS_DEFAULT_FILTER);
        }
        const statuses = rawValue
            .split(',')
            .map((value) => value.trim())
            .filter((value): value is SideQuestStatus => SIDE_STATUS_ORDER.includes(value as SideQuestStatus));
        if (statuses.length === 0) {
            return new Set(SIDE_STATUS_DEFAULT_FILTER);
        }
        return new Set(statuses);
    }
    private getLocalStorage(): Storage | null {
        if (typeof window === 'undefined') {
            return null;
        }
        try {
            return window.localStorage;
        } catch {
            return null;
        }
    }
    private bindLocationClicks(container: HTMLElement): void {
        container.addEventListener('click', (event: MouseEvent) => this.handleLocationClick(event));
    }
    private switchTab(tab: QuestTab): void {
        this.activeTab = tab;
        this.mainTabBtn.classList.toggle('is-active', tab === 'main');
        this.sideTabBtn.classList.toggle('is-active', tab === 'side');
        this.mainTabBtn.setAttribute('aria-selected', String(tab === 'main'));
        this.sideTabBtn.setAttribute('aria-selected', String(tab === 'side'));
        if (tab === 'main') {
            this.hideSideFilterPopup();
        }
        this.updateModeToggleUi();
        this.renderCurrentTab();
    }
    private updateModeToggleUi(): void {
        this.modeToggleContainer.style.display = this.activeTab === 'main' ? '' : 'none';
        this.sideFilterContainer.style.display = this.activeTab === 'side' ? '' : 'none';
        if (this.activeTab === 'main') {
            this.modeToggleLabel.textContent = MAIN_TOGGLE_LABEL;
            this.knownOnlyToggle.checked = this.mainKnownOnlyEnabled;
            this.sideFilterButton.textContent = SIDE_FILTER_BUTTON_LABEL_PREFIX;
            return;
        }
        this.syncSideFilterCheckboxesFromState();
        this.sideFilterButton.textContent = this.buildSideFilterButtonLabel();
    }
    private renderCurrentTab(): void {
        if (!this.lastRenderedQuest) {
            return;
        }
        if (this.activeTab === 'main') {
            this.renderMainQuestTab(this.lastRenderedQuest);
            return;
        }
        this.renderSideQuestTab(this.lastRenderedSideQuests);
    }
    private renderMainQuestTab(quest: QuestNode): void {
        const markup = this.markupBuilder.buildQuestTreeMarkup(quest);
        this.questTitle.textContent = `Main Quest: ${quest.title}`;
        this.questBody.innerHTML = markup;
    }
    private renderSideQuestTab(sideQuests: QuestNode[]): void {
        this.questTitle.textContent = 'Side Quests';
        const filteredQuests = sideQuests.filter((quest) => this.sideStatusFilter.has(this.toSideQuestStatus(quest.status)));
        if (filteredQuests.length === 0) {
            this.questBody.innerHTML = '<p>No known side quests yet.</p>';
            return;
        }
        const cards = filteredQuests
            .map((quest) => this.buildSideQuestCardMarkup(quest))
            .join('');
        this.questBody.innerHTML = `<div class="side-quest-list">${cards}</div>`;
    }
    private buildSideQuestCardMarkup(quest: QuestNode): string {
        const status = quest.status ?? 'active';
        const giverNpc = this.escapeHtml(quest.giverNpcName ?? 'Unknown giver');
        const giverVillage = this.buildLocationLinkMarkup(quest.giverVillageName ?? 'Unknown village');
        const rewardMarkup = quest.reward ? `<div class="side-quest-meta">Reward: ${this.escapeHtml(quest.reward)}</div>` : '';
        const treeMarkup = this.markupBuilder.buildQuestTreeMarkup(quest);
        const title = this.escapeHtml(quest.title);
        const statusLabel = this.formatStatus(status);
        const shouldOpenByDefault = status !== 'completed';
        const regenerateButtonMarkup = this.callbacks.isDeveloperModeEnabled()
            ? `<button class="side-quest-regenerate-btn" type="button" data-side-quest-regenerate-id="${this.escapeHtml(quest.id)}">Regenerate</button>`
            : '';
        return `<details class="side-quest-card" ${shouldOpenByDefault ? 'open' : ''}>
            <summary>${title}<span class="side-quest-status is-${this.escapeHtml(status.toLocaleLowerCase())}">${statusLabel}</span>${regenerateButtonMarkup}</summary>
            <div class="side-quest-meta">Giver: ${giverNpc} · Village: ${giverVillage}</div>
            ${rewardMarkup}
            ${treeMarkup}
        </details>`;
    }
    private formatStatus = (status: string): string => status === 'readyToTurnIn' ? 'Ready to turn in' : status.charAt(0).toUpperCase() + status.slice(1);

    private buildLocationLinkMarkup(locationName: string): string {
        const escapedLocationName = this.escapeHtml(locationName);
        return `<button type="button" class="quest-entity-name location" data-location-name="${escapedLocationName}">${escapedLocationName}</button>`;
    }
    private handleSideFilterButtonClick(): void {
        if (this.activeTab !== 'side') {
            return;
        }
        if (this.sideFilterPopup.style.display === 'none') {
            this.showSideFilterPopup();
            return;
        }
        this.hideSideFilterPopup();
    }
    private handleSideFilterApplyClick(): void {
        const selectedStatuses = SIDE_STATUS_ORDER.filter((status) => this.sideStatusFilterCheckboxes[status].checked);
        if (selectedStatuses.length === 0) {
            this.syncSideFilterCheckboxesFromState();
            this.setFeedback('Select at least one side-quest status before applying filter.', true);
            return;
        }
        this.sideStatusFilter = new Set(selectedStatuses);
        this.persistSideStatusFilter();
        this.sideFilterButton.textContent = this.buildSideFilterButtonLabel();
        this.hideSideFilterPopup();
        this.renderSideQuestTab(this.lastRenderedSideQuests);
    }
    private syncSideFilterCheckboxesFromState(): void {
        SIDE_STATUS_ORDER.forEach((status) => {
            this.sideStatusFilterCheckboxes[status].checked = this.sideStatusFilter.has(status);
        });
    }
    private buildSideFilterButtonLabel(): string {
        const visibleCount = SIDE_STATUS_ORDER.filter((status) => this.sideStatusFilter.has(status)).length;
        return `${SIDE_FILTER_BUTTON_LABEL_PREFIX} (${visibleCount}/${SIDE_STATUS_ORDER.length})`;
    }
    private showSideFilterPopup(): void {
        this.syncSideFilterCheckboxesFromState();
        this.sideFilterPopup.style.display = '';
    }
    private hideSideFilterPopup = (): void => { this.sideFilterPopup.style.display = 'none'; };
    private toSideQuestStatus(status: string | undefined): SideQuestStatus {
        if (status === 'available' || status === 'readyToTurnIn' || status === 'completed') {
            return status;
        }
        return 'active';
    }
    private escapeHtml = (text: string): string => text
        .split('&').join('&amp;')
        .split('<').join('&lt;')
        .split('>').join('&gt;')
        .split('"').join('&quot;')
        .split("'").join('&#39;');
    private handleLocationClick(event: MouseEvent): void {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        const button = target.closest('[data-location-name]');
        if (!(button instanceof HTMLElement)) {
            return;
        }
        const locationName = button.dataset.locationName;
        if (!locationName) {
            return;
        }
        const shownOnMap = this.callbacks.onLocationClick(locationName);
        this.setFeedback(
            shownOnMap ? `Showing ${locationName} on the world map.` : `${locationName} is not discovered yet.`,
            !shownOnMap,
        );
        if (shownOnMap) {
            this.introModal.classList.add('hidden');
        }
    }
    private async handleRegenerateButtonClick(event: MouseEvent): Promise<void> {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        const button = target.closest('[data-side-quest-regenerate-id]');
        if (!(button instanceof HTMLButtonElement) || !this.callbacks.isDeveloperModeEnabled()) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const questId = button.dataset.sideQuestRegenerateId;
        if (!questId) {
            return;
        }
        button.disabled = true;
        try {
            const regenerated = await this.callbacks.onRegenerateSideQuest(questId);
            this.setFeedback(
                regenerated
                    ? 'Side quest regenerated.'
                    : 'Could not regenerate side quest.',
                !regenerated,
            );
        } finally {
            button.disabled = false;
        }
    }
}
