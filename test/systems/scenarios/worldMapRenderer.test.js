import test from 'node:test';
import assert from 'node:assert/strict';

import WorldMapRenderer from '../../../dist/systems/world/worldMap/WorldMapRenderer.js';
import { theme } from '../../../dist/config/ThemeConfig.js';
import { createMockCanvasContext } from '../../helpers/testUtils.js';

test('WorldMapRenderer draws named location landmarks and labels for discovered quest locations', () => {
  const originalPath2D = globalThis.Path2D;
  globalThis.Path2D = class {
    roundRect() {}
    moveTo() {}
    lineTo() {}
    quadraticCurveTo() {}
    closePath() {}
    arc() {}
    ellipse() {}
    rect() {}
  };

  const renderer = new WorldMapRenderer();
  const ctx = createMockCanvasContext();
  ctx.save = () => ctx.calls.push(['save']);
  ctx.restore = () => ctx.calls.push(['restore']);
  ctx.setLineDash = (...args) => ctx.calls.push(['setLineDash', ...args]);
  const cell = { x: 16, y: 24, width: 40, height: 40 };

  try {
    renderer.drawNamedLocation(ctx, cell, 'Cleaver', 'grass', { emphasized: true, showLabel: true });
  } finally {
    globalThis.Path2D = originalPath2D;
  }

  assert.ok(ctx.calls.some(call => call[0] === 'fillText' && call[1] === 'Cleaver'));
  assert.ok(ctx.calls.some(call => call[0] === 'stroke'));
  assert.ok(ctx.calls.some(call => call[0] === 'fill'));
});

test('WorldMapRenderer keeps hidden water tiles visibly water-tinted after discovery', () => {
  const originalPath2D = globalThis.Path2D;
  globalThis.Path2D = class {
    moveTo() {}
    lineTo() {}
    quadraticCurveTo() {}
    closePath() {}
    rect() {}
    addPath() {}
  };

  const renderer = new WorldMapRenderer();
  const ctx = createMockCanvasContext();
  const fillStyles = [];
  let currentFillStyle = '';
  Object.defineProperty(ctx, 'fillStyle', {
    get() {
      return currentFillStyle;
    },
    set(value) {
      currentFillStyle = value;
      fillStyles.push(value);
    },
    configurable: true,
  });

  try {
    renderer.drawCell(
      ctx,
      { x: 10, y: 12, width: 40, height: 40, col: 0, row: 0 },
      'hidden',
      {
        type: 'water',
        color: theme.worldMap.terrain.water,
        pattern: 'waves',
        elevation: 0.2,
        moisture: 0.8,
        heat: 0.4,
        seed: 123,
      },
      undefined,
    );
  } finally {
    globalThis.Path2D = originalPath2D;
  }

  assert.ok(fillStyles.some((value) => value.includes('121, 155, 174')));
  assert.ok(ctx.calls.filter((call) => call[0] === 'fillRect').length >= 2);
});
