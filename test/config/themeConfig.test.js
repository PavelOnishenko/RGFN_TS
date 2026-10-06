import test from 'node:test';
import assert from 'node:assert/strict';

import { applyThemeToCSS, theme } from '../../dist/config/ThemeConfig.js';
import { balanceConfig } from '../../dist/config/balance/balanceConfig.js';

test('applyThemeToCSS writes expected CSS custom properties', () => {
  const applied = new Map();
  global.document = {
    documentElement: {
      style: {
        setProperty: (name, value) => applied.set(name, value),
      },
    },
  };

  applyThemeToCSS();

  assert.equal(applied.get('--color-primary-bg'), theme.ui.primaryBg);
  assert.equal(applied.get('--color-enemy'), theme.ui.enemyColor);
  assert.equal(applied.get('--color-text-muted'), theme.ui.textMuted);
});


test('world-map travel scale defaults align with visibility baseline', () => {
  assert.equal(theme.worldMap.cellTravelMinutes, 12);
  assert.equal(balanceConfig.worldMap.visibilityRadius, 3);
});
