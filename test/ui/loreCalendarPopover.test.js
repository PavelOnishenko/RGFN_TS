import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(projectRoot, 'style.css'), 'utf8');

test('Lore calendar popover is controlled by button-targeted popover wiring', () => {
  assert.match(indexHtml, /id="lore-calendar-jump-btn"[\s\S]*popovertarget="lore-calendar-popover"/);
  assert.match(indexHtml, /id="lore-calendar-popover"[^>]*popover="auto"/);
});

test('Lore calendar popover is hidden by default and visible only when opened', () => {
  assert.match(styleCss, /\.lore-calendar-popover\s*\{[\s\S]*display:\s*none;/);
  assert.match(styleCss, /\.lore-calendar-popover:popover-open\s*\{[\s\S]*display:\s*flex;/);
});
