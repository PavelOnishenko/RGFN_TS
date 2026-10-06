import test from 'node:test';
import assert from 'node:assert/strict';

import GameWorldInteractionRuntime from '../../../dist/game/runtime/GameWorldInteractionRuntime.js';

function createPopup({ width, height }) {
  return {
    offsetWidth: width,
    offsetHeight: height,
    style: { left: '', top: '' },
    classList: {
      removed: new Set(['hidden']),
      remove(name) { this.removed.delete(name); },
      add(name) { this.removed.add(name); },
      contains(name) { return this.removed.has(name); },
    },
  };
}

function createCanvas({ width = 800, height = 600, viewportWidth = 1200, viewportHeight = 900 } = {}) {
  return {
    width,
    height,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: viewportWidth, height: viewportHeight }),
  };
}

test('GameWorldInteractionRuntime positions village entry popup using canvas viewport scale', () => {
  const runtime = new GameWorldInteractionRuntime();
  const villagePopup = createPopup({ width: 200, height: 100 });
  const worldUI = {
    villageEntryTitle: { textContent: '' },
    villageEntryPopup: villagePopup,
  };

  runtime.showWorldVillageEntryPrompt(worldUI, 'Oakcross', { x: 700, y: 300 }, createCanvas());

  assert.equal(worldUI.villageEntryTitle.textContent, 'You found Oakcross.');
  assert.equal(worldUI.villageEntryPopup.style.left, '950px');
  assert.equal(worldUI.villageEntryPopup.style.top, '334px');
  assert.equal(worldUI.villageEntryPopup.classList.contains('hidden'), false);
});

test('GameWorldInteractionRuntime reuses scaled popup placement for ferry prompt', () => {
  const runtime = new GameWorldInteractionRuntime();
  const ferryPopup = createPopup({ width: 230, height: 140 });
  const worldUI = {
    ferryPopup,
    ferryRouteSelect: {
      innerHTML: 'stale',
      selectedIndex: -1,
      options: [],
      appendChild(option) { this.options.push(option); },
    },
    ferryPrice: { textContent: '' },
    ferryTitle: { textContent: '' },
  };

  const originalDocument = global.document;
  global.document = {
    createElement: () => ({ value: '', textContent: '' }),
  };

  try {
    runtime.showWorldFerryPrompt(
      worldUI,
      [{ destinationName: 'Stoneford', waterCells: 8, priceGold: 14 }],
      0,
      { x: 720, y: 500 },
      createCanvas(),
    );
  } finally {
    global.document = originalDocument;
  }

  assert.equal(worldUI.ferryRouteSelect.innerHTML, '');
  assert.equal(worldUI.ferryRouteSelect.options.length, 1);
  assert.equal(worldUI.ferryPopup.style.left, '956px');
  assert.equal(worldUI.ferryPopup.style.top, '594px');
  assert.equal(worldUI.ferryPopup.classList.contains('hidden'), false);
});
