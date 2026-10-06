import Player from '../../entities/player/Player.js';
import Item from '../../entities/Item.js';
import HudInventoryItemMetadata from './HudInventoryItemMetadata.js';
import { BattleEquipmentActionHandler, HudElements } from './HudTypes.js';

type EquipmentSlot = 'main' | 'offhand' | 'armor';
type InventoryItemProvider = () => { item: Item | null; index: number | null };
type HudRefreshHandler = () => void;
type LogHandler = (message: string) => void;

export default class HudEquipmentController {
    private readonly player: Player;
    private readonly hudElements: HudElements;
    private readonly onBattleEquipmentAction: BattleEquipmentActionHandler | null;
    private readonly getDraggedInventoryItem: InventoryItemProvider;
    private readonly refreshHud: HudRefreshHandler;
    private readonly addLog: LogHandler;
    private readonly clearDraggedInventoryIndex: () => void;
    private readonly itemMetadata: HudInventoryItemMetadata;

    constructor(
        player: Player,
        hudElements: HudElements,
        onBattleEquipmentAction: BattleEquipmentActionHandler | null,
        getDraggedInventoryItem: InventoryItemProvider,
        clearDraggedInventoryIndex: () => void,
        refreshHud: HudRefreshHandler,
        addLog: LogHandler,
    ) {
        this.player = player;
        this.hudElements = hudElements;
        this.onBattleEquipmentAction = onBattleEquipmentAction;
        this.getDraggedInventoryItem = getDraggedInventoryItem;
        this.clearDraggedInventoryIndex = clearDraggedInventoryIndex;
        this.refreshHud = refreshHud;
        this.addLog = addLog;
        this.itemMetadata = new HudInventoryItemMetadata(this.player, this.addLog);
    }

    public bindEquipmentSlotEvents(): void {
        this.bindWeaponSlot('main', this.hudElements.weaponSlotMain);
        this.bindWeaponSlot('offhand', this.hudElements.weaponSlotOff);
        this.bindArmorSlot();
    }

    public renderEquipmentSlots(): void {
        const mainWeapon = this.player.equippedMainWeapon;
        const offhandWeapon = this.player.equippedOffhandWeapon;
        const armor = this.player.equippedArmor;
        this.hudElements.weaponSlotMain.classList.remove('equipment-slot-main-equipped', 'equipment-slot-off-equipped');
        this.hudElements.weaponSlotOff.classList.remove('equipment-slot-main-equipped', 'equipment-slot-off-equipped');
        this.renderWeaponSlots(mainWeapon, offhandWeapon);
        this.renderEquipmentSlotContent(this.hudElements.armorSlot, 'Armor', armor ? armor.name : 'Empty', armor?.spriteClass);
        this.applyEquipmentTooltips(mainWeapon, offhandWeapon, armor);
    }

    public handleEquipFromInventory(item: Item): void {
        if (!this.player.canEquipItem(item) || !this.requestBattleEquipmentAction(`You begin equipping ${item.name}.`)) { return; }
        if (item.type === 'weapon') { this.player.equippedWeapon = item; }
        if (item.type === 'armor') { this.player.equippedArmor = item; }
        this.refreshHud();
    }

    private bindWeaponSlot(slot: 'main' | 'offhand', element: HTMLButtonElement): void {
        element.addEventListener('click', (event) => this.handleWeaponSlotClick(slot, event));
        element.addEventListener('dragover', (event) => event.preventDefault());
        element.addEventListener('drop', (event) => { event.preventDefault(); this.handleDropOnEquipmentSlot(slot); });
    }

    private bindArmorSlot(): void {
        this.hudElements.armorSlot.addEventListener('click', () => {
            if (!this.player.equippedArmor || !this.requestBattleEquipmentAction(`You start removing ${this.player.equippedArmor.name}.`)) { return; }
            this.player.unequipArmor();
            this.refreshHud();
        });
        this.hudElements.armorSlot.addEventListener('dragover', (event) => event.preventDefault());
        this.hudElements.armorSlot.addEventListener('drop', (event) => { event.preventDefault(); this.handleDropOnEquipmentSlot('armor'); });
    }

    private handleWeaponSlotClick(slot: 'main' | 'offhand', event: MouseEvent): void {
        const equipped = slot === 'main' ? this.player.equippedWeapon : this.player.equippedOffhandWeapon;
        if (event.shiftKey && equipped?.type === 'weapon') {
            this.itemMetadata.inspectWeaponEnchantments(equipped).forEach((line) => this.addLog(line));
            return;
        }
        if (!equipped || !this.requestBattleEquipmentAction(`You start unequipping ${equipped.name}.`)) { return; }
        slot === 'main' ? this.player.unequipWeapon() : this.player.unequipOffhandWeapon();
        this.refreshHud();
    }

    private handleDropOnEquipmentSlot(slot: EquipmentSlot): void {
        const { item } = this.getDraggedInventoryItem();
        if (!this.canEquipDraggedItem(item) || !this.beginEquipDraggedItem(item)) { return; }
        if (slot === 'armor' && item.type === 'armor') { this.player.equippedArmor = item; }
        if (slot !== 'armor' && item.type === 'weapon') { this.player.equipWeaponToSlot(item, slot); }
        this.clearDraggedInventoryIndex();
        this.refreshHud();
    }

    private beginEquipDraggedItem(item: Item): boolean {
        if (this.requestBattleEquipmentAction(`You begin equipping ${item.name}.`)) { return true; }
        this.clearDraggedInventoryIndex();
        return false;
    }

    private renderWeaponSlots(mainWeapon: Item | null, offhandWeapon: Item | null): void {
        if (!mainWeapon && !offhandWeapon) { this.renderEmptyWeaponSlots(); return; }
        if (mainWeapon?.handsRequired === 2) { this.renderTwoHandedWeaponSlots(mainWeapon); return; }
        this.renderDualWeaponSlots(mainWeapon, offhandWeapon);
    }

    private renderEmptyWeaponSlots(): void {
        this.renderEquipmentSlotContent(this.hudElements.weaponSlotMain, 'Main Hand', 'Fist');
        this.renderEquipmentSlotContent(this.hudElements.weaponSlotOff, 'Off Hand', 'Fist');
    }

    private renderTwoHandedWeaponSlots(mainWeapon: Item): void {
        this.renderEquipmentSlotContent(this.hudElements.weaponSlotMain, 'Main Hand', mainWeapon.name, mainWeapon.spriteClass);
        this.renderEquipmentSlotContent(this.hudElements.weaponSlotOff, 'Off Hand', mainWeapon.name, mainWeapon.spriteClass);
        this.hudElements.weaponSlotMain.classList.add('equipment-slot-main-equipped');
        this.hudElements.weaponSlotOff.classList.add('equipment-slot-main-equipped');
    }

    private renderDualWeaponSlots(mainWeapon: Item | null, offhandWeapon: Item | null): void {
        this.renderEquipmentSlotContent(this.hudElements.weaponSlotMain, 'Main Hand', mainWeapon ? mainWeapon.name : 'Fist', mainWeapon?.spriteClass);
        this.renderEquipmentSlotContent(this.hudElements.weaponSlotOff, 'Off Hand', offhandWeapon ? offhandWeapon.name : 'Fist', offhandWeapon?.spriteClass);
        if (mainWeapon) { this.hudElements.weaponSlotMain.classList.add('equipment-slot-main-equipped'); }
        if (offhandWeapon) { this.hudElements.weaponSlotOff.classList.add('equipment-slot-off-equipped'); }
    }

    private canEquipDraggedItem(item: Item | null): item is Item {
        if (!item) { this.clearDraggedInventoryIndex(); return false; }
        if (this.player.canEquipItem(item)) { return true; }
        this.addLog(`Cannot equip ${item.name}. Requirements are not met.`);
        this.clearDraggedInventoryIndex();
        return false;
    }

    private requestBattleEquipmentAction(actionDescription: string): boolean {
        if (!this.onBattleEquipmentAction) { return true; }
        return this.onBattleEquipmentAction(actionDescription);
    }

    private renderEquipmentSlotContent(slot: HTMLButtonElement, label: string, value: string, spriteClass?: string): void {
        slot.innerHTML = '';
        if (spriteClass) {
            const sprite = document.createElement('span');
            sprite.className = `item-sprite equipment-item-sprite ${spriteClass}`;
            slot.appendChild(sprite);
        }
        const text = document.createElement('span');
        text.className = 'equipment-slot-label';
        text.textContent = `${label}: ${value}`;
        slot.appendChild(text);
        slot.title = `${label}: ${value}`;
    }

    private applyEquipmentTooltips(mainWeapon: Item | null, offhandWeapon: Item | null, armor: Item | null): void {
        this.hudElements.weaponSlotMain.title = this.buildEquipmentTooltip('Main Hand', mainWeapon);
        this.hudElements.weaponSlotOff.title = this.buildEquipmentTooltip('Off Hand', offhandWeapon);
        this.hudElements.armorSlot.title = this.buildEquipmentTooltip('Armor', armor);
    }

    private buildEquipmentTooltip(label: string, item: Item | null): string {
        if (!item) { return `${label}: Empty`; }
        if (item.type !== 'weapon') { return `${label}: ${item.name}`; }
        return [`${label}: ${item.name} — click to unequip • shift+click to inspect enchantments`, ...this.itemMetadata.inspectWeaponEnchantments(item)].join('\n');
    }
}
