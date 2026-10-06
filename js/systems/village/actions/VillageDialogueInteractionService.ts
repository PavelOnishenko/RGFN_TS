/* eslint-disable style-guide/file-length-warning, style-guide/function-length-warning */
import Player from '../../../entities/player/Player.js';
import Item from '../../../entities/Item.js';
import VillageDialogueEngine, { VillageNpcProfile } from '../VillageDialogueEngine.js';
import VillageBarterService from './VillageBarterService.js';
import { QuestCourierInteraction, VillageActionsCallbacks, VillageUI } from './VillageActionsTypes.js';
import { DeliverObjectiveData, LocalDeliveryObjectiveData } from '../../quest/QuestTypes.js';

type DialogueDeps = {
    player: Player;
    villageUI: VillageUI;
    callbacks: VillageActionsCallbacks;
    dialogueEngine: VillageDialogueEngine;
    barterService: VillageBarterService;
    getCurrentVillageName: () => string;
    getSelectedNpc: () => VillageNpcProfile | null;
    addLog: (message: string, type?: string) => void;
    describeDistance: (distanceCells: number) => string;
    updateButtons: () => void;
    getCourierObjectiveForNpc: (npcName: string, villageName: string) => QuestCourierInteraction | null;
    markSideQuestReadyToTurnIn: (questId: string) => boolean;
    refreshSelectedNpcSideQuestUi: () => void;
};

export default class VillageDialogueInteractionService {
    private deps: DialogueDeps;

    constructor(deps: DialogueDeps) {
        this.deps = deps;
    }

    public handleAskAboutSettlement(): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc) {
            this.deps.addLog('Choose an NPC first before asking for directions.', 'system');
            return;
        }

        const targetSettlement = this.deps.villageUI.askVillageInput.value.trim();
        if (!targetSettlement) {
            this.deps.addLog('Type the settlement name you want to find.', 'system');
            return;
        }

        const hint = this.deps.callbacks.getVillageDirectionHint(targetSettlement);
        const answer = this.deps.dialogueEngine.buildLocationAnswer(selectedNpc, hint);
        this.deps.addLog(`You ask ${selectedNpc.name}: "Where is ${targetSettlement}?"`, 'player');
        this.deps.addLog(`${selectedNpc.name} (${selectedNpc.role}, ${answer.truthfulness}): ${answer.speech}`, 'system');
        this.deps.addLog(answer.tone, 'system-message');
        if (hint.exists && answer.truthfulness === 'truth') {
            this.deps.addLog(`Your map notes: ${targetSettlement} lies ${hint.direction} (${this.deps.describeDistance(hint.distanceCells ?? 0)}).`, 'system-message');
        }
    }

    public handleAskAboutPerson(): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc) {
            this.deps.addLog('Choose an NPC first before asking about a person.', 'system');
            return;
        }

        const targetPerson = this.deps.villageUI.askPersonInput.value.trim();
        if (!targetPerson) {
            this.deps.addLog('Type the person name you want to locate.', 'system');
            return;
        }

        const hint = this.deps.barterService.getPersonDirectionHint(targetPerson, this.deps.callbacks.getVillageDirectionHint);
        const answer = this.deps.dialogueEngine.buildPersonLocationAnswer(selectedNpc, hint);
        this.deps.addLog(`You ask ${selectedNpc.name}: "Do you know where ${targetPerson} is?"`, 'player');
        this.deps.addLog(`${selectedNpc.name} (${selectedNpc.role}, ${answer.truthfulness}): ${answer.speech}`, 'system');
        this.deps.addLog(answer.tone, 'system-message');
        if (hint.exists && answer.truthfulness === 'truth') {
            this.deps.addLog(`Journal note: ${targetPerson} is in ${hint.villageName}, ${hint.direction} (${this.deps.describeDistance(hint.distanceCells ?? 0)}).`, 'system-message');
        }
    }

    public handleAskAboutNearbySettlements(): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc) {
            this.deps.addLog('Choose an NPC first before asking about nearby settlements.', 'system');
            return;
        }

        const knownNames = this.deps.callbacks.getKnownSettlementNames?.() ?? [];
        const hints = knownNames.map((name) => this.deps.callbacks.getVillageDirectionHint(name));
        const answer = this.deps.dialogueEngine.buildNearbySettlementsAnswer(selectedNpc, hints, this.deps.getCurrentVillageName());

        this.deps.addLog(`You ask ${selectedNpc.name}: "Какие знаете окрестные поселения?"`, 'player');
        this.deps.addLog(`${selectedNpc.name} (${selectedNpc.role}, ${answer.truthfulness}): ${answer.speech}`, 'system');
        this.deps.addLog(answer.tone, 'system-message');
    }

    public handleAskAboutBarter(): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc) {
            this.deps.addLog('Choose an NPC first before discussing barter.', 'system');
            return;
        }

        const deal = this.deps.barterService.getBarterDealForNpc(this.deps.getCurrentVillageName(), selectedNpc.name);
        if (!deal) {
            this.deps.addLog(`${selectedNpc.name}: "I do not have a special barter right now."`, 'system');
            return;
        }

        if (deal.isCompleted) {
            this.deps.addLog(`${selectedNpc.name}: "Our deal is already done. Keep ${deal.rewardItem.name} safe."`, 'system');
            return;
        }

        this.deps.addLog(`You ask ${selectedNpc.name} about barter terms.`, 'player');
        this.deps.addLog(`${selectedNpc.name}: "${deal.negotiationLine}"`, 'system');
        deal.paymentOptions.forEach((option, index) => {
            const itemText = option.itemCosts.length === 0
                ? 'no item tribute'
                : option.itemCosts.map((itemCost) => `${itemCost.quantity}x ${itemCost.itemName}`).join(', ');
            this.deps.addLog(`Barter option ${index + 1}: ${option.label} -> ${option.goldCost}g + ${itemText}.`, 'system-message');
        });

        this.deps.barterService.buildBarterVerificationTrace(this.deps.player, deal)
            .forEach((line) => this.deps.addLog(line, 'system-message'));
    }

    public handleConfirmBarter(): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc) {
            this.deps.addLog('Choose an NPC before trying to execute barter.', 'system');
            return;
        }
        const deal = this.getActiveBarterDeal(selectedNpc.name);
        if (!deal) {return;}
        this.executeBarterWithNpc(selectedNpc.name, deal);
    }

    public handleConfrontRecoverTarget(): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc) {
            this.deps.addLog('Choose an NPC before starting a confrontation.', 'system');
            return;
        }

        const recoverConfrontation = this.deps.callbacks.onTryStartRecoverConfrontation?.(selectedNpc.name, this.deps.getCurrentVillageName())
            ?? { status: 'not-target' as const };
        if (recoverConfrontation.status === 'started' && recoverConfrontation.enemies) {
            this.deps.addLog(
                `You tell ${selectedNpc.name}: "I need ${recoverConfrontation.itemName ?? 'that item'}, and I'll take it whatever the cost."`,
                'player',
            );
            this.deps.addLog(`${selectedNpc.name} draws steel and attacks.`, 'enemy');
            this.deps.callbacks.onStartBattle?.(recoverConfrontation.enemies);
            return;
        }
        if (recoverConfrontation.status === 'not-ready') {
            this.deps.addLog(`${selectedNpc.name} is not your confirmed target here yet. Ask locals for a solid lead first.`, 'system-message');
            return;
        }
        this.deps.addLog(`${selectedNpc.name} is not the recover target for your current quest.`, 'system-message');
    }

    public handleCourierAction(): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc) {
            this.deps.addLog('Choose an NPC before handling courier handoff.', 'system');
            return;
        }

        const courier = this.deps.getCourierObjectiveForNpc(selectedNpc.name, this.deps.getCurrentVillageName());
        if (!courier) {
            this.deps.addLog(`${selectedNpc.name} has no courier handoff for your active side quests.`, 'system-message');
            return;
        }

        if (courier.objectiveType === 'deliver') {
            this.pickupDeliverObjectiveItem(selectedNpc.name, courier.objective);
            return;
        }
        const { objective, questId } = courier;
        if (!objective.isPickedUp) {
            this.pickupLocalDeliveryItem(selectedNpc.name, objective);
            return;
        }
        this.deliverCourierItem(selectedNpc.name, questId, objective);
    }

    private getActiveBarterDeal(npcName: string): ReturnType<VillageBarterService['getBarterDealForNpc']> {
        const deal = this.deps.barterService.getBarterDealForNpc(this.deps.getCurrentVillageName(), npcName);
        if (!deal) {
            this.deps.addLog(`${npcName} has no barter contract for you.`, 'system');
            return null;
        }
        if (deal.isCompleted) {
            this.deps.addLog(`${npcName} reminds you that this barter is already fulfilled.`, 'system');
            return null;
        }
        return deal;
    }

    private executeBarterWithNpc(npcName: string, deal: NonNullable<ReturnType<VillageBarterService['getBarterDealForNpc']>>): void {
        this.deps.addLog('You declare: "I have what you need, let\'s do our barter."', 'player');
        const payableOption = this.deps.barterService.findFirstPayableOption(this.deps.player, deal);
        if (!payableOption) {
            this.deps.addLog('Barter failed. You do not satisfy any payment option yet.', 'system');
            this.deps.barterService.buildBarterVerificationTrace(this.deps.player, deal).forEach((line) => this.deps.addLog(line, 'system-message'));
            return;
        }
        if (!this.deps.player.addItemToInventory(deal.rewardItem)) {
            this.deps.addLog(`Inventory full. ${deal.rewardItem.name} cannot be received. Free a slot and try again.`, 'system');
            return;
        }
        this.deps.player.gold -= payableOption.goldCost;
        this.deps.barterService.consumeBarterItemCosts(this.deps.player, payableOption.itemCosts);
        deal.isCompleted = true;
        this.deps.addLog(`Barter accepted via "${payableOption.label}".`, 'system-message');
        this.deps.addLog(`You hand over ${payableOption.goldCost}g and agreed tribute. ${npcName} gives you ${deal.rewardItem.name}.`, 'system');
        this.deps.addLog(`Quest-item transfer complete: ${deal.rewardItem.name} is now in your inventory.`, 'system-message');
        this.deps.callbacks.onVillageBarterCompleted(npcName, deal.rewardItem.name, this.deps.getCurrentVillageName());
        this.deps.callbacks.onUpdateHUD();
        this.deps.updateButtons();
    }

    private pickupLocalDeliveryItem(npcName: string, objective: LocalDeliveryObjectiveData): void {
        const questItem = this.createCourierQuestItem(objective.itemName);
        if (!this.deps.player.addItemToInventory(questItem)) {
            this.deps.addLog(`Inventory full. ${objective.itemName} cannot be received. Free a slot and try again.`, 'system');
            return;
        }

        objective.isPickedUp = true;
        this.deps.addLog(`You ask ${npcName}: "I am here for ${objective.itemName}."`, 'player');
        this.deps.addLog(`${npcName} hands over ${objective.itemName}.`, 'system');
        this.deps.addLog(`Courier objective updated: carry ${objective.itemName} to ${objective.recipientNpcName}.`, 'system-message');
        this.deps.callbacks.onUpdateHUD();
        this.deps.refreshSelectedNpcSideQuestUi();
    }

    private pickupDeliverObjectiveItem(npcName: string, objective: DeliverObjectiveData): void {
        const questItem = this.createCourierQuestItem(objective.itemName);
        if (!this.deps.player.addItemToInventory(questItem)) {
            this.deps.addLog(`Inventory full. ${objective.itemName} cannot be received. Free a slot and try again.`, 'system');
            return;
        }
        objective.isPickedUp = true;
        this.deps.addLog(`You ask ${npcName}: "Do you still have ${objective.itemName} for that courier contract?"`, 'player');
        this.deps.addLog(`${npcName} gives you ${objective.itemName} for delivery to ${objective.destinationVillage}.`, 'system');
        this.deps.addLog(`Courier objective updated: travel to ${objective.destinationVillage} while carrying ${objective.itemName}.`, 'system-message');
        this.deps.callbacks.onUpdateHUD();
        this.deps.refreshSelectedNpcSideQuestUi();
    }

    private deliverCourierItem(npcName: string, questId: string, objective: LocalDeliveryObjectiveData): void {
        const itemIndex = this.findInventoryItemIndexByName(objective.itemName);
        if (itemIndex < 0) {
            this.deps.addLog(`You are not carrying ${objective.itemName}. Retrieve it before delivery.`, 'system-message');
            return;
        }

        this.deps.player.removeInventoryItemAt(itemIndex);
        objective.isDelivered = true;
        const markedReady = this.deps.markSideQuestReadyToTurnIn(questId);
        this.deps.addLog(`You tell ${npcName}: "Delivery for you — ${objective.itemName}."`, 'player');
        this.deps.addLog(`${npcName} accepts ${objective.itemName} and confirms delivery.`, 'system');
        this.deps.addLog(
            markedReady
                ? 'Side quest objective complete. Return to the quest giver for turn-in.'
                : 'Delivery recorded, but quest state did not update automatically. Re-open side quests.',
            'system-message',
        );
        this.deps.callbacks.onUpdateHUD();
        this.deps.refreshSelectedNpcSideQuestUi();
    }

    private findInventoryItemIndexByName(itemName: string): number {
        const normalizedItemName = itemName.trim().toLocaleLowerCase();
        return this.deps.player.getInventory().findIndex((item) => item.name.trim().toLocaleLowerCase() === normalizedItemName);
    }

    private createCourierQuestItem(itemName: string): Item {
        const normalized = itemName.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return new Item({
            id: `quest-local-delivery-${normalized || 'package'}`,
            name: itemName,
            description: `Courier package for local delivery: ${itemName}.`,
            type: 'quest',
            goldValue: 0,
            findWeight: 0,
            spriteClass: 'quest-item-sprite',
        });
    }
}
