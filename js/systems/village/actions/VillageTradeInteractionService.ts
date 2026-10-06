import Player from '../../../entities/player/Player.js';
import { createItemById } from '../../../entities/Item.js';
import { balanceConfig } from '../../../config/balance/balanceConfig.js';
import { applyRandomEnchantmentsToGeneratedItem, buildRandomDiscoverableWeapon } from '../../../entities/items/WeaponEnchantments.js';
import VillageStockService from './VillageStockService.js';
import { VillageActionsCallbacks } from './VillageActionsTypes.js';
import { VillageNpcProfile } from '../VillageDialogueEngine.js';
import { NpcCapabilities } from '../../world-sim/npc/NpcTaskTypes.js';

type TradeDeps = {
    player: Player;
    callbacks: VillageActionsCallbacks;
    stockService: VillageStockService;
    getSelectedNpc: () => VillageNpcProfile | null;
    getNpcCapabilities: (npcId: string) => NpcCapabilities;
    addLog: (message: string, type?: string) => void;
    updateButtons: () => void;
};

export default class VillageTradeInteractionService {
    private deps: TradeDeps;

    constructor(deps: TradeDeps) {
        this.deps = deps;
    }

    public handleDoctorTreatment(): void {
        const treatmentCost = balanceConfig.survival.doctorHealCostGold;
        if (this.deps.player.gold < treatmentCost) {
            this.deps.addLog(`Doctor treatment costs ${treatmentCost}g. You need more gold.`, 'system');
            return;
        }

        this.deps.player.gold -= treatmentCost;
        this.deps.player.heal(this.deps.player.maxHp);
        this.deps.callbacks.onAdvanceTime(35, 0.35);
        this.deps.addLog(`The doctor patches you up completely for ${treatmentCost}g. Your HP is fully restored.`, 'player');
        this.deps.callbacks.onUpdateHUD();
        this.deps.updateButtons();
    }

    public handleInnMeal(): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc || !this.deps.getNpcCapabilities(selectedNpc.id).canServeInnMeal) {
            this.deps.addLog('Inn meals are available only while the selected innkeeper is on duty.', 'system');
            return;
        }
        const mealCost = balanceConfig.survival.innMealCostGold;
        if (this.deps.player.gold < mealCost) {
            this.deps.addLog(`A warm meal costs ${mealCost}g. You need more gold.`, 'system');
            return;
        }

        this.deps.player.gold -= mealCost;
        this.deps.player.heal(balanceConfig.survival.innMealHpRecovery);
        this.deps.player.restoreMana(balanceConfig.survival.innMealManaRecovery);
        this.deps.callbacks.onAdvanceTime(50, 0.2);
        this.deps.addLog(
            `You pay ${mealCost}g for food and drink. You recover ${balanceConfig.survival.innMealHpRecovery} HP and ${balanceConfig.survival.innMealManaRecovery} mana.`,
            'player',
        );
        this.deps.callbacks.onUpdateHUD();
        this.deps.updateButtons();
    }

    public handleVillageWait(): void {
        const waitMinutes = Math.max(1, balanceConfig.survival.villageWaitMinutes);
        const hpRecovered = Math.max(0, Math.floor(balanceConfig.survival.villageWaitHpRecovery));
        const manaRecovered = Math.max(0, Math.floor(balanceConfig.survival.villageWaitManaRecovery));
        this.deps.callbacks.onAdvanceTime(waitMinutes, 0.5);
        if (hpRecovered > 0) {
            this.deps.player.heal(hpRecovered);
        }
        if (manaRecovered > 0) {
            this.deps.player.restoreMana(manaRecovered);
        }
        this.deps.addLog(
            `You wait in the village for ${Math.floor(waitMinutes / 60)}h. Fatigue rises, but you slowly recover ${hpRecovered} HP and ${manaRecovered} mana.`,
            'system-message',
        );
        this.deps.callbacks.onUpdateHUD();
        this.deps.updateButtons();
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public handleSleepInRoom(): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc || !this.deps.getNpcCapabilities(selectedNpc.id).canRentRoom) {
            this.deps.addLog('Rooms are available only while the selected innkeeper is on duty.', 'system');
            return;
        }

        const roomCost = balanceConfig.survival.innRoomCostGold;
        if (this.deps.player.gold < roomCost) {
            this.deps.addLog(`Room costs ${roomCost}g. You need more gold.`, 'system');
            return;
        }

        this.deps.player.gold -= roomCost;
        this.deps.callbacks.onAdvanceTime(8 * 60, 0.15);
        const recovered = this.deps.player.recoverFatigue(balanceConfig.survival.villageSleepFatigueRecovery);
        this.deps.player.heal(2);
        this.deps.player.restoreMana(2);
        this.deps.addLog(`${selectedNpc.name} rents you a room for ${roomCost}g. Safe sleep restores ${Math.round(recovered)} fatigue.`, 'player');
        this.deps.callbacks.onUpdateHUD();
        this.deps.updateButtons();
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public handleBuyOffer(offerIndex: number): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc || !this.deps.getNpcCapabilities(selectedNpc.id).canShop) {
            this.deps.addLog('The shop is closed. Speak with an on-duty trader.', 'system');
            return;
        }
        const offer = this.deps.stockService.getOffer(offerIndex);
        if (!offer) {
            this.deps.addLog('This offer is not available.', 'system');
            return;
        }

        if (this.deps.player.gold < offer.buyPrice) {
            this.deps.addLog(`Not enough gold. ${offer.kindName} costs ${offer.buyPrice}g.`, 'system');
            return;
        }

        const item = offer.isEnchantedWeaponOffer
            ? this.buildVillageEnchantedWeapon(offer.buyPrice)
            : this.buildRegularOfferItem(offer.possibleItemIds);
        if (!item) {
            this.deps.addLog('The merchant cannot find that item right now.', 'system');
            return;
        }

        if (!this.deps.player.addItemToInventory(item)) {
            this.deps.addLog('Inventory full. Sell something first.', 'system');
            return;
        }

        this.deps.player.gold -= offer.buyPrice;
        this.deps.callbacks.onAdvanceTime(20, 0.25);
        this.deps.addLog(`You buy ${offer.kindName} (${offer.buyPrice}g) and receive: ${item.name}.`, 'player');
        this.deps.callbacks.onUpdateHUD();
        this.deps.updateButtons();
    }

    // eslint-disable-next-line style-guide/function-length-warning
    public handleSellSelected(selectedIndex: number): void {
        const selectedNpc = this.deps.getSelectedNpc();
        if (!selectedNpc || !this.deps.getNpcCapabilities(selectedNpc.id).canShop) {
            this.deps.addLog('The shop is closed. Speak with an on-duty trader.', 'system');
            return;
        }
        if (!Number.isFinite(selectedIndex)) {
            this.deps.addLog('Choose an inventory item to sell.', 'system');
            return;
        }

        const removedItem = this.deps.player.removeInventoryItemAt(selectedIndex);
        if (!removedItem) {
            this.deps.addLog('That item is no longer available.', 'system');
            this.deps.updateButtons();
            return;
        }

        const sellPrice = this.deps.stockService.getSellPrice(removedItem);
        this.deps.player.gold += sellPrice;
        this.deps.callbacks.onAdvanceTime(15, 0.2);
        this.deps.addLog(`You sold ${removedItem.name} for ${sellPrice}g.`, 'player');
        this.deps.callbacks.onUpdateHUD();
        this.deps.updateButtons();
    }

    private buildRegularOfferItem(itemIds: string[]): ReturnType<typeof createItemById> {
        const itemId = itemIds[Math.floor(Math.random() * itemIds.length)];
        const item = itemId ? createItemById(itemId) : null;
        return item ? applyRandomEnchantmentsToGeneratedItem(item) : null;
    }

    private buildVillageEnchantedWeapon(offerPrice: number): ReturnType<typeof createItemById> {
        const item = buildRandomDiscoverableWeapon();
        if (!item) {
            return null;
        }
        item.goldValue = Math.max(item.goldValue, offerPrice);
        return item;
    }
}
