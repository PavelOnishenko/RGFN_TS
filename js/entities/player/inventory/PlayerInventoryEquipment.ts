import Item from '../../Item.js';

type WeaponSlot = 'main' | 'offhand';

type EquippedItemIds = {
    equippedWeaponId: string | null;
    equippedOffhandWeaponId: string | null;
    equippedArmorId: string | null;
};

export default class PlayerInventoryEquipment {
    private equippedMainWeapon: Item | null = null;
    private equippedOffhandWeapon: Item | null = null;
    private equippedArmor: Item | null = null;

    public getAttackRange = (): number => Math.max(this.equippedMainWeapon?.attackRange ?? 1, this.equippedOffhandWeapon?.attackRange ?? 1);

    public hasWeapon = (): boolean => this.equippedMainWeapon !== null || this.equippedOffhandWeapon !== null;

    public getEquippedWeapon = (): Item | null => this.equippedMainWeapon;
    public getEquippedMainWeapon = (): Item | null => this.equippedMainWeapon;
    public getEquippedOffhandWeapon = (): Item | null => this.equippedOffhandWeapon;
    public getEquippedArmor = (): Item | null => this.equippedArmor;

    public removeItemFromEquipment(removedItem: Item): boolean {
        let equipmentChanged = false;

        if (this.equippedMainWeapon === removedItem) {
            this.equippedMainWeapon = null;
            equipmentChanged = true;
        }
        if (this.equippedOffhandWeapon === removedItem) {
            this.equippedOffhandWeapon = null;
            equipmentChanged = true;
        }
        if (this.equippedArmor === removedItem) {
            this.equippedArmor = null;
            equipmentChanged = true;
        }

        return equipmentChanged;
    }

    public unequipWeapon(moveItemToInventory: (item: Item) => boolean): Item | null {
        const weapon = this.equippedMainWeapon;
        if (!weapon || !moveItemToInventory(weapon)) {
            return null;
        }

        this.equippedMainWeapon = null;
        if (weapon.handsRequired === 2) {
            this.equippedOffhandWeapon = null;
        }

        return weapon;
    }

    public unequipOffhandWeapon(moveItemToInventory: (item: Item) => boolean): Item | null {
        const weapon = this.equippedOffhandWeapon;
        if (!weapon || !moveItemToInventory(weapon)) {
            return null;
        }

        this.equippedOffhandWeapon = null;
        return weapon;
    }

    public unequipArmor(moveItemToInventory: (item: Item) => boolean): Item | null {
        const armor = this.equippedArmor;
        if (!armor || !moveItemToInventory(armor)) {
            return null;
        }

        this.equippedArmor = null;
        return armor;
    }

    public setEquippedWeapon(weapon: Item | null): void {
        this.equippedMainWeapon = weapon;
        if (weapon?.handsRequired === 2) {
            this.equippedOffhandWeapon = null;
        }
    }

    public setEquippedOffhandWeapon = (weapon: Item | null): void => {
        this.equippedOffhandWeapon = weapon;
    };

    public equipWeaponToSlot(weapon: Item, slot: WeaponSlot): void {
        if (weapon.handsRequired === 2) {
            this.equippedMainWeapon = weapon;
            this.equippedOffhandWeapon = null;
            return;
        }

        if (slot === 'main') {
            this.equippedMainWeapon = weapon;
            if (this.equippedOffhandWeapon === weapon) {
                this.equippedOffhandWeapon = null;
            }
            return;
        }

        this.equippedOffhandWeapon = weapon;
        if (this.equippedMainWeapon?.handsRequired === 2 || this.equippedMainWeapon === weapon) {
            this.equippedMainWeapon = null;
        }
    }

    public setEquippedArmor = (armor: Item | null): void => {
        this.equippedArmor = armor;
    };

    public restoreFromFactory(
        equippedWeaponId: string | null,
        equippedOffhandWeaponId: string | null | undefined,
        equippedArmorId: string | null,
        itemFactory: (id: string) => Item | null,
    ): void {
        this.equippedMainWeapon = equippedWeaponId ? itemFactory(equippedWeaponId) : null;
        this.equippedOffhandWeapon = equippedOffhandWeaponId ? itemFactory(equippedOffhandWeaponId) : null;
        if (this.equippedMainWeapon?.handsRequired === 2) {
            this.equippedOffhandWeapon = null;
        }
        this.equippedArmor = equippedArmorId ? itemFactory(equippedArmorId) : null;
    }

    public getEquippedItemIds = (): EquippedItemIds => ({
        equippedWeaponId: this.equippedMainWeapon?.id ?? null,
        equippedOffhandWeaponId: this.equippedOffhandWeapon?.id ?? null,
        equippedArmorId: this.equippedArmor?.id ?? null,
    });
}
