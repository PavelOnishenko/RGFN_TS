import test from 'node:test';
import assert from 'node:assert/strict';

import Player from '../../../dist/entities/player/Player.js';
import Item from '../../../dist/entities/Item.js';
import HudInventoryController from '../../../dist/systems/hud/HudInventoryController.js';

function createClassList() {
  const classes = new Set();
  return {
    add(name) { classes.add(name); },
    remove(name) { classes.delete(name); },
    contains(name) { return classes.has(name); },
  };
}

function createElement() {
  return {
    textContent: '',
    title: '',
    disabled: false,
    draggable: false,
    className: '',
    classList: createClassList(),
    children: [],
    listeners: {},
    setAttribute() {},
    appendChild(child) { this.children.push(child); },
    addEventListener(type, handler) { this.listeners[type] = handler; },
    dispatch(type, payload = {}) {
      const handler = this.listeners[type];
      if (handler) {
        handler(payload);
      }
    },
    set innerHTML(_value) { this.children = []; },
    get innerHTML() { return ''; },
  };
}

test('HudInventoryController keeps the dragged item identity when inventory order changes', () => {
  const originalDocument = global.document;
  global.document = { createElement: () => createElement() };

  try {
    const player = new Player(0, 0);
    const knifePlusOne = new Item({ id: 'knife', name: 'Knife +1', description: 'Light blade', type: 'weapon', handsRequired: 1, damageBonus: 1, requirements: { agility: 0, strength: 0 } });
    const knifePlusFour = new Item({ id: 'knife', name: 'Knife +4', description: 'Light blade', type: 'weapon', handsRequired: 1, damageBonus: 4, requirements: { agility: 0, strength: 0 } });
    player.addItemToInventory(knifePlusOne);
    player.addItemToInventory(knifePlusFour);

    const hudElements = {
      inventoryCount: createElement(),
      inventoryCapacity: createElement(),
      inventoryCapacityHint: createElement(),
      undoLastDropBtn: createElement(),
      inventoryGrid: createElement(),
    };
    let draggedIndex = null;

    const controller = new HudInventoryController(
      player,
      hudElements,
      () => {},
      () => {},
      () => {},
      () => draggedIndex,
      (nextIndex) => { draggedIndex = nextIndex; },
    );

    controller.renderInventoryAndMeta();

    const draggedSlot = hudElements.inventoryGrid.children[1];
    draggedSlot.dispatch('dragstart');

    player.removeInventoryItemAt(0);

    const dragged = controller.getDraggedInventoryItem();
    assert.equal(dragged.item, knifePlusFour);
    assert.equal(dragged.index, 0);
  } finally {
    global.document = originalDocument;
  }
});

test('HudInventoryController fails fast when drag index exists without dragged item reference', () => {
  const originalDocument = global.document;
  global.document = { createElement: () => createElement() };

  try {
    const player = new Player(0, 0);
    const knife = new Item({ id: 'knife', name: 'Knife +1', description: 'Light blade', type: 'weapon', handsRequired: 1, damageBonus: 1, requirements: { agility: 0, strength: 0 } });
    player.addItemToInventory(knife);

    const hudElements = {
      inventoryCount: createElement(),
      inventoryCapacity: createElement(),
      inventoryCapacityHint: createElement(),
      undoLastDropBtn: createElement(),
      inventoryGrid: createElement(),
    };
    let draggedIndex = 0;

    const controller = new HudInventoryController(
      player,
      hudElements,
      () => {},
      () => {},
      () => {},
      () => draggedIndex,
      (nextIndex) => { draggedIndex = nextIndex; },
    );

    assert.throws(
      () => controller.getDraggedInventoryItem(),
      /dragged index 0 exists without a dragged item reference/i,
    );
  } finally {
    global.document = originalDocument;
  }
});

test('HudInventoryController shift+click on weapon logs enchantment parameters instead of equipping', () => {
  const originalDocument = global.document;
  global.document = { createElement: () => createElement() };

  try {
    const player = new Player(0, 0);
    const enchantedKnife = new Item({
      id: 'knife',
      name: 'Doubt Knife +2',
      description: 'Enchanted blade',
      type: 'weapon',
      handsRequired: 1,
      damageBonus: 2,
      requirements: { agility: 0, strength: 0 },
      enchantments: [{ type: 'doubt', doubtDamagePerSecond: 3, doubtDurationSeconds: 2 }],
    });
    player.addItemToInventory(enchantedKnife);

    const hudElements = {
      inventoryCount: createElement(),
      inventoryCapacity: createElement(),
      inventoryCapacityHint: createElement(),
      undoLastDropBtn: createElement(),
      inventoryGrid: createElement(),
    };
    const logs = [];
    let equipCount = 0;

    const controller = new HudInventoryController(
      player,
      hudElements,
      () => { equipCount += 1; },
      () => {},
      (message) => logs.push(message),
      () => null,
      () => {},
    );

    controller.renderInventoryAndMeta();
    const slot = hudElements.inventoryGrid.children[0];
    slot.dispatch('click', { shiftKey: true });

    assert.equal(equipCount, 0);
    assert.equal(logs.some((line) => line.includes('Doubt') && line.includes('damage per turn') && line.includes('2 turns')), true);
  } finally {
    global.document = originalDocument;
  }
});
