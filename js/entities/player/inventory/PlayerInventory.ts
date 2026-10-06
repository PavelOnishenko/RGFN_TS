import Item from '../../Item.js';
import { ItemData } from '../../ItemDeclarations.js';
import PlayerInventoryEquipment from './PlayerInventoryEquipment.js';
import type { InventoryState, PlayerInventoryHooks, PotionItemId, RestoreInventoryStateArgs } from './PlayerInventoryTypes.js';

export default class PlayerInventory {
    private readonly hooks: PlayerInventoryHooks;
    private readonly equipment = new PlayerInventoryEquipment();
    private readonly inventory: Item[] = [];

    constructor(hooks: PlayerInventoryHooks) {
        this.hooks = hooks;
    }
    public addItem(item: Item): boolean {
        if (this.inventory.length >= this.hooks.getInventoryCapacity()) {
            return false;
        }
        this.inventory.push(item);
        return true;
    }
    public useHealingPotion = (): boolean => this.usePotionById('healingPotion', this.hooks.onHealingPotionUsed);

    public useManaPotion = (): boolean => this.usePotionById('manaPotion', this.hooks.onManaPotionUsed);

    public getItems = (): Item[] => [...this.inventory];
    public getHealingPotionCount = (): number => this.countPotionById('healingPotion');
    public getManaPotionCount = (): number => this.countPotionById('manaPotion');
    public removeHealingPotion = (): boolean => this.removePotionById('healingPotion');
    public removeManaPotion = (): boolean => this.removePotionById('manaPotion');
    public getAttackRange = (): number => this.equipment.getAttackRange();
    public hasWeapon = (): boolean => this.equipment.hasWeapon();
    public getEquippedWeapon = (): Item | null => this.equipment.getEquippedWeapon();
    public getEquippedMainWeapon = (): Item | null => this.equipment.getEquippedMainWeapon();
    public getEquippedOffhandWeapon = (): Item | null => this.equipment.getEquippedOffhandWeapon();
    public getEquippedArmor = (): Item | null => this.equipment.getEquippedArmor();

    public removeItemAt(index: number): Item | null {
        if (index < 0 || index >= this.inventory.length) {
            return null;
        }

        const [removedItem] = this.inventory.splice(index, 1);
        if (this.equipment.removeItemFromEquipment(removedItem)) {
            this.hooks.onEquipmentChanged();
        }
        return removedItem;
    }
    public unequipWeapon(): Item | null {
        const weapon = this.equipment.unequipWeapon(this.moveItemToInventory);
        if (!weapon) {
            return null;
        }
        this.hooks.onEquipmentChanged();
        return weapon;
    }
    public unequipOffhandWeapon(): Item | null {
        const weapon = this.equipment.unequipOffhandWeapon(this.moveItemToInventory);
        if (!weapon) {
            return null;
        }
        this.hooks.onEquipmentChanged();
        return weapon;
    }
    public unequipArmor(): Item | null {
        const armor = this.equipment.unequipArmor(this.moveItemToInventory);
        if (!armor) {
            return null;
        }
        this.hooks.onEquipmentChanged();
        return armor;
    }
    public setEquippedWeapon(weapon: Item | null): void {
        this.moveEquippedItemsToInventory([this.equipment.getEquippedMainWeapon(), this.equipment.getEquippedOffhandWeapon()], [weapon]);
        this.removeItemFromInventory(weapon);
        this.equipment.setEquippedWeapon(weapon);
        this.hooks.onEquipmentChanged();
    }
    public setEquippedOffhandWeapon(weapon: Item | null): void {
        this.moveEquippedItemsToInventory([this.equipment.getEquippedOffhandWeapon()], [this.equipment.getEquippedMainWeapon(), weapon]);
        this.removeItemFromInventory(weapon);
        this.equipment.setEquippedOffhandWeapon(weapon);
        this.hooks.onEquipmentChanged();
    }
    public equipWeaponToSlot(weapon: Item, slot: 'main' | 'offhand'): void {
        const previousMainWeapon = this.equipment.getEquippedMainWeapon();
        const previousOffhandWeapon = this.equipment.getEquippedOffhandWeapon();

        this.removeItemFromInventory(weapon);
        this.equipment.equipWeaponToSlot(weapon, slot);
        this.moveEquippedItemsToInventory(
            [previousMainWeapon, previousOffhandWeapon],
            [this.equipment.getEquippedMainWeapon(), this.equipment.getEquippedOffhandWeapon()],
        );
        this.hooks.onEquipmentChanged();
    }
    public setEquippedArmor(armor: Item | null): void {
        this.moveEquippedItemsToInventory([this.equipment.getEquippedArmor()], [armor]);
        this.removeItemFromInventory(armor);
        this.equipment.setEquippedArmor(armor);
        this.hooks.onEquipmentChanged();
    }
    public restoreState({ itemIds, equippedWeaponId, equippedArmorId, itemFactory, equippedOffhandWeaponId }: RestoreInventoryStateArgs): void {
        this.restoreInventoryItems(itemIds, itemFactory);
        this.equipment.restoreFromFactory(equippedWeaponId, equippedOffhandWeaponId, equippedArmorId, itemFactory);
        this.hooks.onEquipmentChanged();
    }
    public getState = (): InventoryState => ({
        inventoryItemIds: this.inventory.map((item) => item.id),
        inventoryItems: this.inventory.map((item) => item.toItemData()),
        equippedWeapon: this.equipment.getEquippedMainWeapon()?.toItemData() ?? null,
        equippedOffhandWeapon: this.equipment.getEquippedOffhandWeapon()?.toItemData() ?? null,
        equippedArmor: this.equipment.getEquippedArmor()?.toItemData() ?? null,
        ...this.equipment.getEquippedItemIds(),
    });

    public restoreStateFromSnapshots(
        inventoryItems: ItemData[] | undefined,
        equippedWeapon: ItemData | null | undefined,
        equippedOffhandWeapon: ItemData | null | undefined,
        equippedArmor: ItemData | null | undefined,
    ): boolean {
        if (!Array.isArray(inventoryItems)) {
            return false;
        }
        this.inventory.length = 0;
        inventoryItems.forEach((itemData) => this.inventory.push(new Item(itemData)));
        this.equipment.setEquippedWeapon(equippedWeapon ? new Item(equippedWeapon) : null);
        this.equipment.setEquippedOffhandWeapon(equippedOffhandWeapon ? new Item(equippedOffhandWeapon) : null);
        this.equipment.setEquippedArmor(equippedArmor ? new Item(equippedArmor) : null);
        this.hooks.onEquipmentChanged();
        return true;
    }

    private readonly moveItemToInventory = (item: Item): boolean => {
        if (this.inventory.includes(item)) {
            return true;
        }
        if (this.inventory.length >= this.hooks.getInventoryCapacity()) {
            return false;
        }
        this.inventory.push(item);
        return true;
    };

    private usePotionById(id: PotionItemId, onUsed: () => void): boolean {
        const potionIndex = this.findPotionIndex(id);
        if (potionIndex === -1) {
            return false;
        }
        this.inventory.splice(potionIndex, 1);
        onUsed();
        return true;
    }

    private countPotionById = (id: PotionItemId): number => this.inventory.filter((item) => item.id === id).length;

    private removePotionById(id: PotionItemId): boolean {
        const potionIndex = this.findPotionIndex(id);
        if (potionIndex === -1) {
            return false;
        }
        this.inventory.splice(potionIndex, 1);
        return true;
    }

    private findPotionIndex = (id: PotionItemId): number => this.inventory.findIndex((item) => item.id === id);

    private removeItemFromInventory(item: Item | null): void {
        if (!item) {
            return;
        }
        const index = this.inventory.indexOf(item);
        if (index !== -1) {
            this.inventory.splice(index, 1);
        }
    }

    private moveEquippedItemsToInventory(previousItems: Array<Item | null>, nextItems: Array<Item | null>): void {
        const nextItemsSet = new Set(nextItems.filter((item): item is Item => item !== null));
        for (const item of previousItems) {
            if (!item || nextItemsSet.has(item)) {
                continue;
            }
            this.moveItemToInventory(item);
        }
    }

    private restoreInventoryItems(itemIds: string[], itemFactory: (id: string) => Item | null): void {
        this.inventory.length = 0;
        for (const itemId of itemIds) {
            const item = itemFactory(itemId);
            if (item) {
                this.inventory.push(item);
            }
        }
    }
}
