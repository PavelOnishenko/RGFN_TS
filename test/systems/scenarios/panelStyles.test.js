import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('HUD panel style rules keep content clipped and panels resizable on desktop', () => {
  const css = readFileSync(resolve(process.cwd(), 'style.css'), 'utf8');

  assert.match(css, /#magic-panel, #inventory-panel, #skills-panel, #quests-panel, #lore-panel, #stats-panel, #selected-panel, #group-panel,/);
  assert.match(css, /overflow:\s*auto;/);
  assert.match(css, /resize:\s*both;/);
  assert.match(css, /max-height:\s*calc\(100dvh - 32px\);/);
  assert.match(css, /\.panel-corner-drag-handle\s*\{[^}]*right:\s*22px;[^}]*bottom:\s*2px;/s);
  assert.match(css, /\.panel-corner-drag-handle\s*\{[^}]*cursor:\s*grab;/s);
});

test('HUD panel style rules disable resizing on narrow viewports', () => {
  const css = readFileSync(resolve(process.cwd(), 'style.css'), 'utf8');

  assert.match(css, /@media \(max-width: 920px\)/);
  assert.match(css, /#magic-panel, #inventory-panel, #skills-panel, #quests-panel, #lore-panel, #stats-panel, #selected-panel, #group-panel,/);
  assert.match(css, /resize:\s*none;/);
  assert.match(css, /\.panel-corner-drag-handle\s*\{\s*display:\s*none;/);
});
