/* eslint-disable
    style-guide/arrow-function-style,
    style-guide/function-length-warning,
    style-guide/rule17-comma-layout
*/
import { HudElements } from '../ui/GameUiTypes.js';

const el = (id: string): HTMLElement => document.getElementById(id)!;
const btn = (id: string): HTMLButtonElement => document.getElementById(id)! as HTMLButtonElement;
const input = (id: string): HTMLInputElement => document.getElementById(id)! as HTMLInputElement;

export class GameHudElementsFactory {
    public create = (): HudElements => ({
        ...this.createTopLevelHudElements(),
        ...this.createPlayerStatElements(),
        ...this.createMagicAndInventoryElements(),
        ...this.createPanelElements(),
        ...this.createSelectedCellElements(),
    } as HudElements);

    private createTopLevelHudElements(): Partial<HudElements> {
        return {
            hudMenuToggleBtn: btn('hud-menu-toggle-btn'),
            hudMenuPanel: el('hud-menu-panel'),
            modeIndicator: el('mode-indicator'),
            usePotionBtn: btn('use-potion-btn'),
            useManaPotionBtn: btn('use-mana-potion-btn'),
            newCharacterBtn: btn('new-character-btn'),
            worldMapPanel: el('world-sidebar'),
            logPanel: el('game-log-container'),
            worldInfoPanel: el('world-info-panel'),
            rosterPanel: el('village-roster-panel'),
            questIntroModal: el('quest-intro-modal'),
            questIntroBody: el('quest-intro-body'),
            questIntroCloseBtn: btn('quest-intro-close-btn'),
        };
    }

    private createPlayerStatElements(): Partial<HudElements> {
        return {
            ...this.createPlayerValueElements(),
            ...this.createSkillButtonElements(),
        };
    }

    private createPlayerValueElements(): Partial<HudElements> {
        return {
            playerLevel: el('player-level'),
            playerName: el('player-name'),
            playerXp: el('player-xp'),
            playerXpNext: el('player-xp-next'),
            playerHp: el('player-hp'),
            playerMaxHp: el('player-max-hp'),
            playerMana: el('player-mana'),
            playerMaxMana: el('player-max-mana'),
            playerDmg: el('player-dmg'),
            playerDmgFormula: el('player-dmg-formula'),
            playerArmor: el('player-armor'),
            playerDodge: el('player-dodge'),
            playerDodgeFormula: el('player-dodge-formula'),
            playerWeapon: el('player-weapon'),
            playerGold: el('player-gold'),
            playerClock: el('player-clock'),
            playerDate: el('player-date'),
            worldCalendarSummary: el('world-calendar-summary'),
            worldCalendarList: el('world-calendar-list'),
            playerFatigue: el('player-fatigue'),
            playerFatigueState: el('player-fatigue-state'),
            skillPoints: el('skill-points'),
            magicPoints: el('magic-points'),
            magicPanelPoints: el('magic-panel-points'),
            statVitality: el('stat-vitality'),
            statToughness: el('stat-toughness'),
            statStrength: el('stat-strength'),
            statAgility: el('stat-agility'),
            statConnection: el('stat-connection'),
            statIntelligence: el('stat-intelligence'),
        };
    }

    private createSkillButtonElements(): Partial<HudElements> {
        return {
            addVitalityBtn: btn('add-vitality-btn'),
            subVitalityBtn: btn('sub-vitality-btn'),
            addToughnessBtn: btn('add-toughness-btn'),
            subToughnessBtn: btn('sub-toughness-btn'),
            addStrengthBtn: btn('add-strength-btn'),
            subStrengthBtn: btn('sub-strength-btn'),
            addAgilityBtn: btn('add-agility-btn'),
            subAgilityBtn: btn('sub-agility-btn'),
            addConnectionBtn: btn('add-connection-btn'),
            subConnectionBtn: btn('sub-connection-btn'),
            addIntelligenceBtn: btn('add-intelligence-btn'),
            subIntelligenceBtn: btn('sub-intelligence-btn'),
            saveSkillsBtn: btn('save-skills-btn'),
            godSkillsBtn: btn('god-skills-btn'),
        };
    }

    private createMagicAndInventoryElements(): Partial<HudElements> {
        return {
            upgradeFireballBtn: btn('upgrade-fireball-btn'),
            upgradeCurseBtn: btn('upgrade-curse-btn'),
            upgradeSlowBtn: btn('upgrade-slow-btn'),
            upgradeRageBtn: btn('upgrade-rage-btn'),
            upgradeArcaneLanceBtn: btn('upgrade-arcane-lance-btn'),
            spellLevelFireball: el('spell-level-fireball'),
            spellLevelCurse: el('spell-level-curse'),
            spellLevelSlow: el('spell-level-slow'),
            spellLevelRage: el('spell-level-rage'),
            spellLevelArcaneLance: el('spell-level-arcane-lance'),
            spellDetailsFireball: el('spell-details-fireball'),
            spellDetailsCurse: el('spell-details-curse'),
            spellDetailsSlow: el('spell-details-slow'),
            spellDetailsRage: el('spell-details-rage'),
            spellDetailsArcaneLance: el('spell-details-arcane-lance'),
            inventoryCount: el('inventory-count'),
            inventoryCapacity: el('inventory-capacity'),
            inventoryCapacityHint: el('inventory-capacity-hint'),
            undoLastDropBtn: btn('undo-last-drop-btn'),
            inventoryGrid: el('inventory-grid'),
            weaponSlotMain: btn('weapon-slot-main'),
            weaponSlotOff: btn('weapon-slot-off'),
            armorSlot: btn('armor-slot'),
            questsTitle: el('quests-title'),
            questsKnownOnlyToggle: input('quests-known-only-toggle'),
            questsBody: el('quests-body'),
            groupBody: el('group-body'),
            loreBody: el('lore-body'),
        };
    }

    private createPanelElements(): Partial<HudElements> {
        return {
            statsPanel: el('stats-panel'),
            skillsPanel: el('skills-panel'),
            inventoryPanel: el('inventory-panel'),
            magicPanel: el('magic-panel'),
            questsPanel: el('quests-panel'),
            selectedPanel: el('selected-panel'),
            lorePanel: el('lore-panel'),
            groupPanel: el('group-panel'),
            toggleStatsPanelBtn: btn('toggle-stats-panel-btn'),
            toggleSkillsPanelBtn: btn('toggle-skills-panel-btn'),
            toggleInventoryPanelBtn: btn('toggle-inventory-panel-btn'),
            toggleMagicPanelBtn: btn('toggle-magic-panel-btn'),
            toggleQuestsPanelBtn: btn('toggle-quests-panel-btn'),
            toggleGroupPanelBtn: btn('toggle-group-panel-btn'),
            toggleLorePanelBtn: btn('toggle-lore-panel-btn'),
            toggleSelectedPanelBtn: btn('toggle-selected-panel-btn'),
            toggleWorldMapPanelBtn: btn('toggle-world-map-panel-btn'),
            toggleLogPanelBtn: btn('toggle-log-panel-btn'),
            toggleWorldInfoPanelBtn: btn('toggle-world-info-panel-btn'),
            toggleRosterPanelBtn: btn('toggle-roster-panel-btn'),
        };
    }

    private createSelectedCellElements(): Partial<HudElements> {
        return {
            selectedCellEmpty: el('selected-cell-empty'),
            selectedCellDetails: el('selected-cell-details'),
            selectedCellCoords: el('selected-cell-coords'),
            selectedCellTerrain: el('selected-cell-terrain'),
            selectedCellVisibility: el('selected-cell-visibility'),
            selectedCellTraversable: el('selected-cell-traversable'),
            selectedCellVillage: el('selected-cell-village'),
            selectedCellVillageName: el('selected-cell-village-name'),
            selectedCellVillageStatus: el('selected-cell-village-status'),
        };
    }
}
