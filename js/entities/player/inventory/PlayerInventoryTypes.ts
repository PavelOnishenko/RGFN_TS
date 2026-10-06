import Item from '../../Item.js';
import { ItemData } from '../../ItemDeclarations.js';

export type PlayerInventoryHooks = {
    onEquipmentChanged: () => void;
    onHealingPotionUsed: () => void;
    onManaPotionUsed: () => void;
    canEquip: (item: Item) => boolean;
    getInventoryCapacity: () => number;
};

export type InventoryState = {
    inventoryItemIds: string[];
    equippedWeaponId: string | null;
    equippedOffhandWeaponId: string | null;
    equippedArmorId: string | null;
    inventoryItems?: ItemData[];
    equippedWeapon?: ItemData | null;
    equippedOffhandWeapon?: ItemData | null;
    equippedArmor?: ItemData | null;
};

export type RestoreInventoryStateArgs = {
    itemIds: string[];
    equippedWeaponId: string | null;
    equippedArmorId: string | null;
    itemFactory: (id: string) => Item | null;
    equippedOffhandWeaponId?: string | null;
};

export type PotionItemId = 'healingPotion' | 'manaPotion';
