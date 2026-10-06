import Player from '../../entities/player/Player.js';
import MagicSystem from './magic/MagicSystem.js';
import LoreBookController from './lore/LoreBookController.js';
import HudEquipmentController from '../hud/HudEquipmentController.js';
import HudInventoryController from '../hud/HudInventoryController.js';
import HudMagicController from '../hud/HudMagicController.js';
import HudPanelStateController from '../hud/HudPanelStateController.js';
import HudSelectionInfoController from '../hud/HudSelectionInfoController.js';
import {
    BattleEquipmentActionHandler,
    BattleUiHudElements,
    HudElements,
    HudPanel,
    PendingSkillAllocations,
} from '../hud/HudTypes.js';
import { SelectedCellInfo } from '../../types/game.js';

type WorldTimeSnapshot = { clock: string; date: string; calendarTitle: string; calendarLines: string[] };

export default class HudController {
    private readonly player: Player;
    private readonly hudElements: HudElements;
    private readonly battleUI: BattleUiHudElements;
    private readonly loreBookController: LoreBookController;
    private pendingSkillAllocations: PendingSkillAllocations = { vitality: 0, toughness: 0, strength: 0, agility: 0, connection: 0, intelligence: 0 };
    private draggedInventoryIndex: number | null = null;
    private readonly inventoryController: HudInventoryController;
    private readonly equipmentController: HudEquipmentController;
    private readonly magicController: HudMagicController;
    private readonly panelStateController: HudPanelStateController;
    private readonly selectionInfoController: HudSelectionInfoController;
    private readonly getWorldTimeSnapshot: () => WorldTimeSnapshot;

    constructor(
        player: Player,
        hudElements: HudElements,
        battleUI: BattleUiHudElements,
        magicSystem: MagicSystem,
        gameLog: HTMLElement,
        loreBookController: LoreBookController,
        onBattleEquipmentAction?: BattleEquipmentActionHandler,
        getWorldTimeSnapshot?: () => WorldTimeSnapshot,
    ) {
        this.player = player;
        this.hudElements = hudElements;
        this.battleUI = battleUI;
        this.loreBookController = loreBookController;
        const addLog = this.createLogAppender(gameLog);
        this.inventoryController = this.createInventoryController(addLog);
        this.equipmentController = this.createEquipmentController(onBattleEquipmentAction, addLog);
        this.magicController = new HudMagicController(this.player, this.hudElements, this.battleUI, magicSystem);
        this.panelStateController = new HudPanelStateController(this.hudElements);
        this.selectionInfoController = new HudSelectionInfoController(this.hudElements);
        this.getWorldTimeSnapshot = getWorldTimeSnapshot ?? (() => ({
            clock: '--:--',
            date: 'Unknown date',
            calendarTitle: 'Calendar is unavailable',
            calendarLines: [],
        }));

        this.equipmentController.bindEquipmentSlotEvents();
        this.inventoryController.bindInventoryRecoveryEvents();
    }

    private createLogAppender(gameLog: HTMLElement): (message: string, type?: string) => void {
        return (message: string, type: string = 'system'): void => {
            const div = document.createElement('div');
            div.textContent = message;
            div.classList.add(`${type}-action`);
            gameLog.appendChild(div);
            gameLog.scrollTop = gameLog.scrollHeight;
        };
    }

    private createInventoryController(addLog: (message: string, type?: string) => void): HudInventoryController {
        return new HudInventoryController(
            this.player,
            this.hudElements,
            (item) => this.equipmentController.handleEquipFromInventory(item),
            () => this.updateHUD(),
            (message) => addLog(message),
            () => this.draggedInventoryIndex,
            (index) => { this.draggedInventoryIndex = index; },
        );
    }

    private createEquipmentController(
        onBattleEquipmentAction: BattleEquipmentActionHandler | undefined,
        addLog: (message: string, type?: string) => void,
    ): HudEquipmentController {
        return new HudEquipmentController(
            this.player,
            this.hudElements,
            onBattleEquipmentAction ?? null,
            () => this.inventoryController.getDraggedInventoryItem(),
            () => { this.draggedInventoryIndex = null; },
            () => this.updateHUD(),
            (message) => addLog(message),
        );
    }

    public setPendingSkillAllocations = (pendingSkillAllocations: PendingSkillAllocations): void => {
        this.pendingSkillAllocations = pendingSkillAllocations;
    };

    public updateHUD(): void {
        this.updateCoreStats();
        this.magicController.renderSpellLevelsAndDetails();
        this.equipmentController.renderEquipmentSlots();
        this.inventoryController.renderInventoryAndMeta();
        this.updatePotionButtonsAndRange();
        this.loreBookController.render();
        this.updateStatButtons();
        this.magicController.updateSpellButtons();
        this.panelStateController.updateToggleButtons();
    }

    public togglePanel(panel: HudPanel): void {
        this.panelStateController.togglePanel(panel);
    }

    public updateSelectedCellInfo(selectedCell: SelectedCellInfo | null): void {
        this.selectionInfoController.updateSelectedCellInfo(selectedCell);
    }

    public updateGroupPanel(lines: string[]): void {
        this.hudElements.groupBody.innerHTML = '';
        if (lines.length === 0) {
            this.hudElements.groupBody.textContent = 'No companions are traveling with you.';
            return;
        }
        lines.forEach((line) => {
            const row = document.createElement('div');
            row.className = 'stat';
            row.textContent = line;
            this.hudElements.groupBody.appendChild(row);
        });
    }

    private updateCoreStats(): void {
        const pending = this.pendingSkillAllocations;
        const pendingTotal = Object.values(pending).reduce((total, value) => total + value, 0);
        const remainingSkillPoints = this.player.skillPoints - pendingTotal;

        this.hudElements.playerLevel.textContent = String(this.player.level);
        this.hudElements.playerName.textContent = this.player.name;
        this.hudElements.playerXp.textContent = String(this.player.xp);
        this.hudElements.playerXpNext.textContent = String(this.player.xpToNextLevel);
        this.hudElements.playerHp.textContent = String(this.player.hp);
        this.hudElements.playerMaxHp.textContent = String(this.player.maxHp);
        this.hudElements.playerMana.textContent = String(this.player.mana);
        this.hudElements.playerMaxMana.textContent = String(this.player.maxMana);
        this.hudElements.playerDmg.textContent = String(this.player.getPhysicalDamageWithBuff());
        this.hudElements.playerDmgFormula.textContent = this.player.getDamageFormulaText();
        this.hudElements.playerArmor.textContent = String(this.player.armor);
        this.hudElements.playerDodge.textContent = `${(this.player.avoidChance * 100).toFixed(1)}%`;
        this.hudElements.playerDodgeFormula.textContent = this.player.getAvoidFormulaText();
        this.hudElements.skillPoints.textContent = String(remainingSkillPoints);
        this.hudElements.magicPoints.textContent = String(this.player.magicPoints);
        this.hudElements.magicPanelPoints.textContent = String(this.player.magicPoints);
        this.hudElements.statVitality.textContent = String(this.player.vitality + pending.vitality);
        this.hudElements.statToughness.textContent = String(this.player.toughness + pending.toughness);
        this.hudElements.statStrength.textContent = String(this.player.strength + pending.strength);
        this.hudElements.statAgility.textContent = String(this.player.agility + pending.agility);
        this.hudElements.statConnection.textContent = String(this.player.connection + pending.connection);
        this.hudElements.statIntelligence.textContent = String(this.player.intelligence + pending.intelligence);
        this.hudElements.playerWeapon.textContent = this.player.equippedWeapon ? this.player.equippedWeapon.name : 'None';
        this.hudElements.playerGold.textContent = String(this.player.gold);
        this.hudElements.playerFatigue.textContent = `${Math.round(this.player.fatigue)}/${this.player.getMaxFatigue()} (${this.player.getFatiguePercent().toFixed(0)}%)`;
        this.hudElements.playerFatigueState.textContent = this.player.getFatigueStateLabel();
        const worldTime = this.getWorldTimeSnapshot();
        this.hudElements.playerClock.textContent = worldTime.clock;
        this.hudElements.playerDate.textContent = worldTime.date;
        this.hudElements.worldCalendarSummary.textContent = worldTime.calendarTitle;
        this.hudElements.worldCalendarList.textContent = worldTime.calendarLines.join('\n');
    }

    private updatePotionButtonsAndRange(): void {
        const hasHpPotion = this.player.getHealingPotionCount() > 0;
        const hasManaPotion = this.player.getManaPotionCount() > 0;
        this.hudElements.usePotionBtn.disabled = !hasHpPotion;
        this.battleUI.usePotionBtn.disabled = !hasHpPotion;
        this.hudElements.useManaPotionBtn.disabled = !hasManaPotion;
        this.battleUI.useManaPotionBtn.disabled = !hasManaPotion;

        const attackRange = this.player.getAttackRange();
        this.battleUI.attackRangeText.textContent = attackRange === 1 ? 'Attack when adjacent (1 tile)' : `Attack from ${attackRange} tiles away`;
    }

    private updateStatButtons(): void {
        const pending = this.pendingSkillAllocations;
        const pendingTotal = Object.values(pending).reduce((total, value) => total + value, 0);
        const remainingSkillPoints = this.player.skillPoints - pendingTotal;
        const hasRemainingSkillPoints = remainingSkillPoints > 0;

        this.hudElements.addVitalityBtn.disabled = !hasRemainingSkillPoints;
        this.hudElements.addToughnessBtn.disabled = !hasRemainingSkillPoints;
        this.hudElements.addStrengthBtn.disabled = !hasRemainingSkillPoints;
        this.hudElements.addAgilityBtn.disabled = !hasRemainingSkillPoints;
        this.hudElements.addConnectionBtn.disabled = !hasRemainingSkillPoints;
        this.hudElements.addIntelligenceBtn.disabled = !hasRemainingSkillPoints;
        this.hudElements.subVitalityBtn.disabled = pending.vitality <= 0;
        this.hudElements.subToughnessBtn.disabled = pending.toughness <= 0;
        this.hudElements.subStrengthBtn.disabled = pending.strength <= 0;
        this.hudElements.subAgilityBtn.disabled = pending.agility <= 0;
        this.hudElements.subConnectionBtn.disabled = pending.connection <= 0;
        this.hudElements.subIntelligenceBtn.disabled = pending.intelligence <= 0;
        this.hudElements.saveSkillsBtn.disabled = !Object.values(pending).some((value) => value > 0);

        const hasMagicPoints = this.player.magicPoints > 0;
        this.hudElements.upgradeFireballBtn.disabled = !hasMagicPoints;
        this.hudElements.upgradeCurseBtn.disabled = !hasMagicPoints;
        this.hudElements.upgradeSlowBtn.disabled = !hasMagicPoints;
        this.hudElements.upgradeRageBtn.disabled = !hasMagicPoints;
        this.hudElements.upgradeArcaneLanceBtn.disabled = !hasMagicPoints;
    }
}
