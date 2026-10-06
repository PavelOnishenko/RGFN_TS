import { HudElements, HudPanel } from './HudTypes.js';
import { isDeveloperModeEnabled } from '../../utils/DeveloperModeConfig.js';

export default class HudPanelStateController {
    private readonly hudElements: HudElements;

    constructor(hudElements: HudElements) {
        this.hudElements = hudElements;
    }

    public togglePanel(panel: HudPanel): void {
        if ((panel === 'roster' || panel === 'worldInfo') && !isDeveloperModeEnabled()) {
            return;
        }
        this.getPanelMap()[panel].classList.toggle('hidden');
        this.updateToggleButtons();
    }

    public updateToggleButtons(): void {
        this.syncDeveloperRosterVisibility();
        this.hudElements.toggleStatsPanelBtn.classList.toggle('active', !this.hudElements.statsPanel.classList.contains('hidden'));
        this.hudElements.toggleSkillsPanelBtn.classList.toggle('active', !this.hudElements.skillsPanel.classList.contains('hidden'));
        this.hudElements.toggleInventoryPanelBtn.classList.toggle('active', !this.hudElements.inventoryPanel.classList.contains('hidden'));
        this.hudElements.toggleMagicPanelBtn.classList.toggle('active', !this.hudElements.magicPanel.classList.contains('hidden'));
        this.hudElements.toggleQuestsPanelBtn.classList.toggle('active', !this.hudElements.questsPanel.classList.contains('hidden'));
        this.hudElements.toggleGroupPanelBtn.classList.toggle('active', !this.hudElements.groupPanel.classList.contains('hidden'));
        this.hudElements.toggleLorePanelBtn.classList.toggle('active', !this.hudElements.lorePanel.classList.contains('hidden'));
        this.hudElements.toggleSelectedPanelBtn.classList.toggle('active', !this.hudElements.selectedPanel.classList.contains('hidden'));
        this.hudElements.toggleWorldMapPanelBtn.classList.toggle('active', !this.hudElements.worldMapPanel.classList.contains('hidden'));
        this.hudElements.toggleLogPanelBtn.classList.toggle('active', !this.hudElements.logPanel.classList.contains('hidden'));
        this.hudElements.toggleWorldInfoPanelBtn.classList.toggle('active', !this.hudElements.worldInfoPanel.classList.contains('hidden'));
        this.hudElements.toggleRosterPanelBtn.classList.toggle('active', !this.hudElements.rosterPanel.classList.contains('hidden'));
    }

    private getPanelMap = (): Record<HudPanel, HTMLElement> => ({
        stats: this.hudElements.statsPanel,
        skills: this.hudElements.skillsPanel,
        inventory: this.hudElements.inventoryPanel,
        magic: this.hudElements.magicPanel,
        quests: this.hudElements.questsPanel,
        group: this.hudElements.groupPanel,
        lore: this.hudElements.lorePanel,
        selected: this.hudElements.selectedPanel,
        worldMap: this.hudElements.worldMapPanel,
        log: this.hudElements.logPanel,
        worldInfo: this.hudElements.worldInfoPanel,
        roster: this.hudElements.rosterPanel,
    });

    private syncDeveloperRosterVisibility(): void {
        const developerModeEnabled = isDeveloperModeEnabled();
        this.hudElements.toggleWorldInfoPanelBtn.classList.toggle('hidden', !developerModeEnabled);
        this.hudElements.toggleRosterPanelBtn.classList.toggle('hidden', !developerModeEnabled);
        if (!developerModeEnabled) {
            this.hudElements.worldInfoPanel.classList.add('hidden');
            this.hudElements.rosterPanel.classList.add('hidden');
        }
    }
}
