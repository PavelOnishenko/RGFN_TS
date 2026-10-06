/* eslint-disable style-guide/function-length-warning */
import Player from '../../../entities/player/Player.js';
import Item from '../../../entities/Item.js';
import { VillageNpcProfile } from '../VillageDialogueEngine.js';
import { VillageOffer, VillageUI } from './VillageActionsTypes.js';
import { NpcCapabilities } from '../../world-sim/npc/NpcTaskTypes.js';

type PresenterDeps = {
    player: Player;
    villageUI: VillageUI;
    gameLog: HTMLElement;
    onSelectNpc: (index: number) => void;
    getOffers: () => VillageOffer[];
    getSelectedNpc: () => VillageNpcProfile | null;
    getNpcCapabilities: (npcId: string) => NpcCapabilities;
    getSellPrice: (item: Item) => number;
    isInnkeeper: (role: string) => boolean;
    shouldShowBarterNowAction: (npcName: string) => boolean;
    shouldShowAskBarterAction: (npcName: string) => boolean;
    getCourierActionLabel: (npcName: string, villageName: string) => string | null;
    shouldShowConfrontRecoverAction: (npcName: string, villageName: string) => boolean;
    shouldShowRecruitEscortAction: (npcName: string, villageName: string) => boolean;
    shouldShowDefendAction: (npcName: string, villageName: string) => boolean;
    getCurrentVillageName: () => string;
};

export default class VillageUiPresenter {
    private deps: PresenterDeps;

    constructor(deps: PresenterDeps) {
        this.deps = deps;
    }

    public openDialogueWindow(): void {
        this.deps.villageUI.dialogueModal.classList.remove('hidden');
    }

    public closeDialogueWindow(): void {
        this.deps.villageUI.dialogueModal.classList.add('hidden');
    }

    public addLog(message: string, type: string = 'system'): void {
        this.appendLogLine(this.deps.gameLog, message, type);
        this.appendLogLine(this.deps.villageUI.dialogueLog, message, type);
        this.deps.gameLog.scrollTop = this.deps.gameLog.scrollHeight;
        this.deps.villageUI.dialogueLog.scrollTop = this.deps.villageUI.dialogueLog.scrollHeight;
    }

    public updateButtons(): void {
        this.updateBuyButtons();
        this.refreshSellOptions();
        this.deps.villageUI.sellSelectedBtn.disabled = this.deps.villageUI.sellSelect.disabled;
        const selectedNpc = this.deps.getSelectedNpc();
        const hasSelectedNpc = selectedNpc !== null;
        const selectedCapabilities = selectedNpc ? this.deps.getNpcCapabilities(selectedNpc.id) : null;
        this.deps.villageUI.askVillageBtn.disabled = !hasSelectedNpc;
        this.deps.villageUI.askPersonBtn.disabled = !hasSelectedNpc;
        const selectedNpcName = selectedNpc?.name ?? '';
        const currentVillageName = this.deps.getCurrentVillageName();
        const showAskBarter = hasSelectedNpc && this.deps.shouldShowAskBarterAction(selectedNpcName);
        const showBarterNow = hasSelectedNpc && this.deps.shouldShowBarterNowAction(selectedNpcName);
        const courierActionLabel = hasSelectedNpc ? this.deps.getCourierActionLabel(selectedNpcName, currentVillageName) : null;
        const showCourierAction = Boolean(courierActionLabel);
        const showConfrontRecover = hasSelectedNpc && this.deps.shouldShowConfrontRecoverAction(selectedNpcName, currentVillageName);
        const showRecruitEscort = hasSelectedNpc && this.deps.shouldShowRecruitEscortAction(selectedNpcName, currentVillageName);
        const showDefendVillage = hasSelectedNpc && this.deps.shouldShowDefendAction(selectedNpcName, currentVillageName);
        this.updateDialogueQuestActionVisibility(showAskBarter, showBarterNow, showCourierAction, showConfrontRecover, showRecruitEscort, showDefendVillage);
        if (showCourierAction && courierActionLabel) {
            this.deps.villageUI.courierActionBtn.textContent = courierActionLabel;
        }
        this.deps.villageUI.sleepRoomBtn.disabled = !selectedCapabilities?.canRentRoom;
        this.deps.villageUI.innMealBtn.disabled = !selectedCapabilities?.canServeInnMeal;
    }

    private updateDialogueQuestActionVisibility(
        showAskBarter: boolean,
        showBarterNow: boolean,
        showCourierAction: boolean,
        showConfrontRecover: boolean,
        showRecruitEscort: boolean,
        showDefendVillage: boolean,
    ): void {
        this.deps.villageUI.askBarterBtn.classList.toggle('hidden', !showAskBarter);
        this.deps.villageUI.barterNowBtn.classList.toggle('hidden', !showBarterNow);
        this.deps.villageUI.courierActionBtn.classList.toggle('hidden', !showCourierAction);
        this.deps.villageUI.confrontRecoverBtn.classList.toggle('hidden', !showConfrontRecover);
        this.deps.villageUI.recruitEscortBtn.classList.toggle('hidden', !showRecruitEscort);
        this.deps.villageUI.defendVillageBtn.classList.toggle('hidden', !showDefendVillage);

        this.deps.villageUI.askBarterBtn.disabled = !showAskBarter;
        this.deps.villageUI.barterNowBtn.disabled = !showBarterNow;
        this.deps.villageUI.courierActionBtn.disabled = !showCourierAction;
        this.deps.villageUI.confrontRecoverBtn.disabled = !showConfrontRecover;
        this.deps.villageUI.recruitEscortBtn.disabled = !showRecruitEscort;
        this.deps.villageUI.defendVillageBtn.disabled = !showDefendVillage;
    }

    public renderNpcButtons(npcRoster: VillageNpcProfile[], selectedNpcId: string | null): void {
        this.deps.villageUI.npcList.innerHTML = '';
        npcRoster.forEach((npc, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'action-btn village-npc-btn';
            const capabilities = this.deps.getNpcCapabilities(npc.id);
            const status = this.describeUnavailableReason(capabilities);
            button.textContent = `${npc.name} (${npc.role})${status ? ` — ${status}` : ''}`;
            if (npc.role.includes('[DEAD]') || !capabilities.canTalk) {
                button.disabled = true;
            }
            if (selectedNpcId === npc.id) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => this.deps.onSelectNpc(index));
            this.deps.villageUI.npcList.appendChild(button);
        });
    }

    public updateNpcPanel(npc: VillageNpcProfile | null): void {
        if (!npc) {
            this.deps.villageUI.npcTitle.textContent = 'Choose someone to talk to';
            this.deps.villageUI.dialogueSelectedNpc.textContent = 'Select an NPC in the village rumors panel first.';
            this.deps.villageUI.sideQuestList.innerHTML = '<p>Select an NPC to view side quests.</p>';
            return;
        }

        this.deps.villageUI.npcTitle.textContent = `${npc.name}, ${npc.role} — ${npc.speechStyle}`;
        this.deps.villageUI.dialogueSelectedNpc.textContent = `Speaking with ${npc.name}, ${npc.role}.`;
    }

    private updateBuyButtons(): void {
        const buyButtons = [this.deps.villageUI.buyOffer1Btn, this.deps.villageUI.buyOffer2Btn, this.deps.villageUI.buyOffer3Btn, this.deps.villageUI.buyOffer4Btn];
        const selectedNpc = this.deps.getSelectedNpc();
        const shopAvailable = Boolean(selectedNpc && this.deps.getNpcCapabilities(selectedNpc.id).canShop);

        buyButtons.forEach((button, index) => {
            const offer = this.deps.getOffers()[index];
            if (!offer) {
                button.disabled = true;
                button.textContent = 'Unavailable';
                return;
            }

            const canAfford = this.deps.player.gold >= offer.buyPrice;
            button.disabled = !canAfford || !shopAvailable;
            button.textContent = `Buy ${offer.kindName} (${offer.buyPrice}g) · random tier`;
        });
    }

    private refreshSellOptions(): void {
        const selectedValue = this.deps.villageUI.sellSelect.value;
        const inventory = this.deps.player.getInventory();
        this.deps.villageUI.sellSelect.innerHTML = '';
        inventory.forEach((item, index) => this.appendSellOption(item, index));

        if (this.deps.villageUI.sellSelect.options.length === 0) {
            this.appendNoSellOption();
            this.deps.villageUI.sellSelect.disabled = true;
            return;
        }

        const selectedNpc = this.deps.getSelectedNpc();
        const shopAvailable = Boolean(selectedNpc && this.deps.getNpcCapabilities(selectedNpc.id).canShop);
        this.deps.villageUI.sellSelect.disabled = !shopAvailable;
        const hasPreviousSelection = Array.from(this.deps.villageUI.sellSelect.options)
            .some((option) => option.value === selectedValue);
        this.deps.villageUI.sellSelect.value = hasPreviousSelection
            ? selectedValue
            : this.deps.villageUI.sellSelect.options[0].value;
    }

    private appendSellOption(item: Item, index: number): void {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${item.name} (+${this.deps.getSellPrice(item)}g)`;
        this.deps.villageUI.sellSelect.appendChild(option);
    }

    private appendNoSellOption(): void {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'No inventory items to sell';
        this.deps.villageUI.sellSelect.appendChild(placeholder);
    }

    private appendLogLine(container: HTMLElement, message: string, type: string): void {
        const line = document.createElement('div');
        line.textContent = message;
        line.classList.add(`${type}-action`);
        container.appendChild(line);
    }

    private describeUnavailableReason(capabilities: NpcCapabilities): string {
        const labels = { sleeping: 'Sleeping', away: 'Away', working: 'Working', dead: 'Dead' } as const;
        return capabilities.unavailableReason ? labels[capabilities.unavailableReason] : '';
    }
}
