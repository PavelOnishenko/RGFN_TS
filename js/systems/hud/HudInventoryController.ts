import { balanceConfig } from '../../config/balance/balanceConfig.js';
import Item from '../../entities/Item.js';
import Player from '../../entities/player/Player.js';
import HudInventoryItemMetadata from './HudInventoryItemMetadata.js';
import { HudElements } from './HudTypes.js';

type EquipHandler = (item: Item, slotElement: HTMLButtonElement) => void;
type HudRefreshHandler = () => void;
type LogHandler = (message: string) => void;
type DraggedInventoryIndexGetter = () => number | null;
type DraggedInventoryIndexSetter = (index: number | null) => void;

export default class HudInventoryController {
    private readonly player: Player;
    private readonly hudElements: HudElements;
    private readonly onEquip: EquipHandler;
    private readonly refreshHud: HudRefreshHandler;
    private readonly addLog: LogHandler;
    private readonly getDraggedInventoryIndex: DraggedInventoryIndexGetter;
    private readonly setDraggedInventoryIndex: DraggedInventoryIndexSetter;
    private readonly itemMetadata: HudInventoryItemMetadata;
    private lastDroppedItem: Item | null = null;
    private draggedInventoryItem: Item | null = null;

    constructor(
        player: Player,
        hudElements: HudElements,
        onEquip: EquipHandler,
        refreshHud: HudRefreshHandler,
        addLog: LogHandler,
        getDraggedInventoryIndex: DraggedInventoryIndexGetter,
        setDraggedInventoryIndex: DraggedInventoryIndexSetter,
    ) {
        this.player = player;
        this.hudElements = hudElements;
        this.onEquip = onEquip;
        this.refreshHud = refreshHud;
        this.addLog = addLog;
        this.getDraggedInventoryIndex = getDraggedInventoryIndex;
        this.setDraggedInventoryIndex = setDraggedInventoryIndex;
        this.itemMetadata = new HudInventoryItemMetadata(this.player, this.addLog);
    }

    public bindInventoryRecoveryEvents(): void {
        this.hudElements.undoLastDropBtn.addEventListener('click', () => {
            if (!this.lastDroppedItem) {
                return;
            }

            const itemToRecover = this.lastDroppedItem;
            const recovered = this.player.addItemToInventory(itemToRecover);
            if (!recovered) {
                this.addLog(`Cannot recover ${itemToRecover.name}: inventory is full.`);
                this.refreshHud();
                return;
            }

            this.lastDroppedItem = null;
            this.addLog(`Recovered ${itemToRecover.name}.`);
            this.refreshHud();
        });
    }

    public renderInventoryAndMeta(): void {
        const inventory = this.player.getInventory();
        const inventoryCapacity = this.player.getInventoryCapacity();
        this.hudElements.inventoryCount.textContent = String(inventory.length);
        this.hudElements.inventoryCapacity.textContent = String(inventoryCapacity);
        this.hudElements.inventoryCapacityHint.textContent = this.getInventoryCapacityHintText();
        this.hudElements.undoLastDropBtn.disabled = this.lastDroppedItem === null;
        this.renderInventory(inventory, inventoryCapacity);
    }

    public getDraggedInventoryItem(): { item: Item | null; index: number | null } {
        const draggedItem = this.assertConsistentDragState();
        if (!draggedItem) { return { item: null, index: null }; }
        const inventory = this.player.getInventory();
        const index = inventory.indexOf(draggedItem);
        if (index === -1) {
            throw new Error('HudInventoryController invariant violation: dragged item reference is missing from inventory.');
        }

        return { item: draggedItem, index };
    }

    public tryEquipItem(item: Item, slotElement: HTMLButtonElement): boolean {
        if (this.player.canEquipItem(item)) {
            return true;
        }

        this.itemMetadata.triggerEquipRequirementsFeedback(item, slotElement);
        return false;
    }

    public clearDraggedInventoryItem(): void { this.draggedInventoryItem = null; this.setDraggedInventoryIndex(null); }

    private renderInventory(inventory: Item[], inventoryCapacity: number): void {
        this.hudElements.inventoryGrid.innerHTML = '';
        for (let index = 0; index < inventoryCapacity; index++) {
            const slot = document.createElement('button');
            slot.type = 'button';
            slot.className = 'inventory-slot';
            slot.setAttribute('draggable', 'false');
            const item = inventory[index];
            item ? this.setupInventorySlot(slot, item, index) : this.setupEmptySlot(slot);
            this.hudElements.inventoryGrid.appendChild(slot);
        }
    }

    private setupInventorySlot(slot: HTMLButtonElement, item: Item, index: number): void {
        slot.title = this.itemMetadata.buildInventoryTooltip(item);
        slot.draggable = item.type === 'weapon' || item.type === 'armor';
        this.bindInventorySlotInteractionEvents(slot, item, index);
        this.appendInventorySlotVisuals(slot, item);
        this.bindEquipClickIfApplicable(slot, item);
    }

    private appendInventorySlotVisuals(slot: HTMLButtonElement, item: Item): void {
        const sprite = document.createElement('div');
        sprite.className = `item-sprite ${item.spriteClass}`;
        slot.appendChild(sprite);

        const name = document.createElement('span');
        name.className = 'inventory-slot-name';
        name.textContent = item.name;
        slot.appendChild(name);
    }

    private bindEquipClickIfApplicable(slot: HTMLButtonElement, item: Item): void {
        if (item.type === 'weapon' || item.type === 'armor') {
            slot.addEventListener('click', (event) => {
                if (item.type === 'weapon' && event.shiftKey) {
                    this.itemMetadata.inspectWeaponEnchantments(item).forEach((line) => this.addLog(line));
                    return;
                }
                if (this.tryEquipItem(item, slot)) {
                    this.onEquip(item, slot);
                }
            });
        }
    }

    private bindInventorySlotInteractionEvents(slot: HTMLButtonElement, item: Item, index: number): void {
        slot.addEventListener('dragstart', () => this.handleDragStart(slot, item, index));
        slot.addEventListener('dragend', () => this.handleDragEnd(slot));
        slot.addEventListener('mouseenter', () => slot.classList.add('inventory-slot-hovered'));
        slot.addEventListener('mouseleave', () => slot.classList.remove('inventory-slot-hovered'));
        slot.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            this.handleDropFromInventory(index);
        });
    }

    private handleDragStart(slot: HTMLButtonElement, item: Item, index: number): void { this.draggedInventoryItem = item; this.setDraggedInventoryIndex(index); slot.classList.add('inventory-slot-dragging'); }
    private handleDragEnd(slot: HTMLButtonElement): void { this.draggedInventoryItem = null; this.setDraggedInventoryIndex(null); slot.classList.remove('inventory-slot-dragging'); }

    private assertConsistentDragState(): Item | null {
        const draggedIndex = this.getDraggedInventoryIndex();
        if (draggedIndex === null) {
            if (this.draggedInventoryItem !== null) { throw new Error('HudInventoryController invariant violation: dragged item exists while dragged index is null.'); }
            return null;
        }
        if (!this.draggedInventoryItem) { throw new Error(`HudInventoryController invariant violation: dragged index ${draggedIndex} exists without a dragged item reference.`); }
        return this.draggedInventoryItem;
    }

    private setupEmptySlot(slot: HTMLButtonElement): void {
        slot.classList.add('empty');
        slot.disabled = true;
    }

    private handleDropFromInventory(index: number): void {
        const droppedItem = this.player.removeInventoryItemAt(index);
        if (!droppedItem) {
            return;
        }

        this.lastDroppedItem = droppedItem;
        this.addLog(`You dropped ${droppedItem.name}. Click Recover Last Dropped Item to undo.`);
        this.refreshHud();
    }

    private getInventoryCapacityHintText(): string {
        const baseSlots = balanceConfig.player.baseInventorySlots;
        const strengthStep = balanceConfig.player.strengthPerInventorySlot;
        return `${baseSlots} base slots, +1 slot every ${strengthStep} STR`;
    }
}
