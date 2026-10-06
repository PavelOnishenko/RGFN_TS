import Item from '../../../entities/Item.js';
import { balanceConfig } from '../../../config/balance/balanceConfig.js';
import { NON_POTION_KINDS, POTION_KINDS, VillageOffer } from './VillageActionsTypes.js';

export default class VillageStockService {
    private currentOffers: VillageOffer[] = [];

    public refreshVillageStock(): void {
        const potionOffer = this.pickOne(POTION_KINDS);
        const nonPotionOffers = this.pickMany(NON_POTION_KINDS, 3);
        this.currentOffers = [potionOffer, ...nonPotionOffers].map((offerKind) => ({
            kindName: offerKind.kindName,
            buyPrice: offerKind.buyPrice,
            possibleItemIds: offerKind.itemIds,
        }));
        this.tryInjectEnchantedWeaponOffer();
    }

    public getCurrentOffers = (): VillageOffer[] => this.currentOffers;

    public getOffer = (index: number): VillageOffer | undefined => this.currentOffers[index];

    public getSellPrice = (item: Item): number => Math.max(1, Math.ceil(item.goldValue * 0.5));

    private tryInjectEnchantedWeaponOffer(): void {
        const chance = balanceConfig.items.enchantments.villageSpecialOfferChance;
        if (Math.random() >= chance || this.currentOffers.length < 2) {
            return;
        }
        const replaceIndex = 1 + Math.floor(Math.random() * (this.currentOffers.length - 1));
        const replacedOffer = this.currentOffers[replaceIndex];
        if (!replacedOffer) {
            return;
        }
        this.currentOffers[replaceIndex] = {
            kindName: 'Enchanted Weapon',
            buyPrice: Math.max(1, Math.ceil(replacedOffer.buyPrice * 1.8)),
            possibleItemIds: [],
            isEnchantedWeaponOffer: true,
        };
    }

    private pickOne = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];

    private pickMany<T>(array: T[], count: number): T[] {
        const copy = [...array];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }

        return copy.slice(0, Math.min(count, copy.length));
    }
}
