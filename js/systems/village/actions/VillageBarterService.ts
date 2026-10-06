import Player from '../../../entities/player/Player.js';
import Item from '../../../entities/Item.js';
import { PersonDirectionHint, VillageDirectionHint } from '../VillageDialogueEngine.js';
import {
    BarterItemCost,
    BarterPaymentOption,
    QuestBarterContract,
    VillageBarterDeal,
} from './VillageActionsTypes.js';
export default class VillageBarterService {
    private villageBarterDeals: Map<string, VillageBarterDeal[]> = new Map();
    private questBarterContracts: Map<string, QuestBarterContract> = new Map();
    private barterContractVillageById: Map<string, string> = new Map();
    public configureQuestBarterContracts(contracts: QuestBarterContract[]): void {
        this.questBarterContracts.clear();
        this.barterContractVillageById.clear();
        this.villageBarterDeals.clear();
        contracts.forEach((contract, index) => this.storeContract(contract, index));
    }
    public assignQuestBarterContractsIfNeeded(villageName: string): void {
        if (this.questBarterContracts.size === 0) {
            return;
        }
        this.questBarterContracts.forEach((contract, contractId) => {
            if (this.barterContractVillageById.has(contractId)) {
                return;
            }
            const preferredVillage = contract.sourceVillage?.trim();
            const normalizedPreferred = preferredVillage?.toLocaleLowerCase();
            const normalizedVillage = villageName.trim().toLocaleLowerCase();
            if (normalizedPreferred && normalizedPreferred === normalizedVillage) {
                this.barterContractVillageById.set(contractId, villageName);
                return;
            }
            const hasAnyAssignment = this.barterContractVillageById.size > 0;
            if (!hasAnyAssignment && !normalizedPreferred) {
                this.barterContractVillageById.set(contractId, villageName);
            }
        });
    }
    public getVillageContractTraders = (villageName: string): string[] => Array.from(this.questBarterContracts.entries())
        .filter(([contractId]) => this.barterContractVillageById.get(contractId) === villageName)
        .map(([, contract]) => contract.traderName);
    public getVillageContractHints = (villageName: string): string[] => Array.from(this.questBarterContracts.entries())
        .filter(([contractId]) => this.barterContractVillageById.get(contractId) === villageName)
        .map(([, contract]) => this.toHint(contract));
    public getKnownTraderNames = (): string[] => Array.from(new Set(Array.from(this.questBarterContracts.values()).map((contract) => contract.traderName)))
        .sort((left, right) => left.localeCompare(right));
    public getBarterDealForNpc(villageName: string, npcName: string): VillageBarterDeal | null {
        const deals = this.getOrCreateVillageBarterDeals(villageName);
        return deals.find((deal) => deal.traderName.toLocaleLowerCase() === npcName.toLocaleLowerCase()) ?? null;
    }
    public getPersonDirectionHint(personName: string, getVillageDirectionHint: (name: string) => VillageDirectionHint): PersonDirectionHint {
        const normalizedPerson = personName.trim().toLocaleLowerCase();
        const contract = Array.from(this.questBarterContracts.entries())
            .find(([, value]) => value.traderName.trim().toLocaleLowerCase() === normalizedPerson);
        if (!contract) {
            return { personName, exists: false };
        }
        const [contractId, value] = contract;
        const villageName = this.barterContractVillageById.get(contractId);
        if (!villageName) {
            return { personName: value.traderName, exists: false };
        }
        const villageHint = getVillageDirectionHint(villageName);
        return {
            personName: value.traderName,
            exists: villageHint.exists,
            villageName: villageHint.exists ? villageName : undefined,
            direction: villageHint.direction,
            distanceCells: villageHint.distanceCells,
        };
    }
    public findFirstPayableOption = (player: Player, deal: VillageBarterDeal): BarterPaymentOption | null =>
        deal.paymentOptions.find((option) => this.canPay(player, option)) ?? null;
    public consumeBarterItemCosts(player: Player, itemCosts: BarterItemCost[]): void {
        itemCosts.forEach((itemCost) => {
            let remaining = itemCost.quantity;
            while (remaining > 0) {
                const inventory = player.getInventory();
                const itemIndex = inventory.findIndex((item) => item.id === itemCost.itemId);
                if (itemIndex === -1) {
                    return;
                }
                player.removeInventoryItemAt(itemIndex);
                remaining -= 1;
            }
        });
    }
    public buildBarterVerificationTrace(player: Player, deal: VillageBarterDeal): string[] {
        const lines = ['Barter verification trace starts.'];
        deal.paymentOptions.forEach((option, index) => {
            const goldOk = player.gold >= option.goldCost;
            lines.push(`Option ${index + 1} "${option.label}" gold check: ${player.gold}g / required ${option.goldCost}g => ${goldOk ? 'PASS' : 'FAIL'}.`);
            this.buildItemCheckLines(player, option, index).forEach((line) => lines.push(line));
        });
        lines.push('Barter verification trace ends.');
        return lines;
    }
    private buildItemCheckLines(player: Player, option: BarterPaymentOption, index: number): string[] {
        if (option.itemCosts.length === 0) {
            return [`Option ${index + 1} item check: no item tribute required => PASS.`];
        }
        return option.itemCosts.map((itemCost) => {
            const owned = player.getInventory().filter((item) => item.id === itemCost.itemId).length;
            const ok = owned >= itemCost.quantity;
            return `Option ${index + 1} item check: ${itemCost.itemName} ${owned}/${itemCost.quantity} => ${ok ? 'PASS' : 'FAIL'}.`;
        });
    }
    private canPay(player: Player, option: BarterPaymentOption): boolean {
        if (player.gold < option.goldCost) {
            return false;
        }
        const inventory = player.getInventory();
        return option.itemCosts.every((itemCost) => inventory.filter((item) => item.id === itemCost.itemId).length >= itemCost.quantity);
    }
    private getOrCreateVillageBarterDeals(villageName: string): VillageBarterDeal[] {
        const cached = this.villageBarterDeals.get(villageName);
        if (cached) {
            return cached;
        }
        const deals = Array.from(this.questBarterContracts.entries())
            .filter(([contractId]) => this.barterContractVillageById.get(contractId) === villageName)
            .filter(([, contract]) => contract.contractType !== 'recover')
            .map(([contractId, contract]) => this.createDealFromContract(contractId, contract.traderName, contract.itemName));
        this.villageBarterDeals.set(villageName, deals);
        return deals;
    }
    private storeContract(contract: QuestBarterContract, index: number): void {
        const traderName = contract.traderName.trim();
        const itemName = contract.itemName.trim();
        if (!traderName || !itemName) {
            return;
        }
        const contractId = `contract-${index}-${traderName.toLocaleLowerCase()}-${itemName.toLocaleLowerCase()}`;
        this.questBarterContracts.set(contractId, {
            traderName,
            itemName,
            sourceVillage: contract.sourceVillage?.trim(),
            destinationVillage: contract.destinationVillage?.trim(),
            contractType: contract.contractType,
        });
    }
    private toHint(contract: QuestBarterContract): string {
        if (contract.contractType === 'recover') {
            return `${contract.traderName} was last seen here with ${contract.itemName}.`;
        }
        if (contract.contractType === 'deliver' && contract.destinationVillage) {
            return `${contract.traderName} can hand over ${contract.itemName} here. Deliver it to ${contract.destinationVillage}.`;
        }
        return `${contract.traderName} is available for barter (${contract.itemName}).`;
    }
    private createDealFromContract(contractId: string, traderName: string, itemName: string): VillageBarterDeal {
        const normalized = itemName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const majorGoldCost = Math.max(14, Math.min(40, 12 + itemName.length));
        const splitGoldCost = Math.max(4, Math.floor(majorGoldCost * 0.35));
        return {
            contractId,
            traderName,
            rewardItem: new Item({
                id: `quest_${normalized || 'artifact'}`,
                name: itemName,
                description: 'Quest artifact transferred via sworn barter.',
                type: 'armor',
                goldValue: 0,
            }),
            negotiationLine: `For ${itemName}, pay in coin or combine coin with reagent. Choose your route.`,
            paymentOptions: [
                { label: 'Coin-only settlement', goldCost: majorGoldCost, itemCosts: [] },
                { label: 'Split payment', goldCost: splitGoldCost, itemCosts: [{ itemId: 'manaPotion', itemName: 'Mana Potion', quantity: 1 }] },
            ],
            isCompleted: false,
        };
    }
}
