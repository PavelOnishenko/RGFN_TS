import test from 'node:test';
import assert from 'node:assert/strict';

import timingConfig from '../../dist/config/timingConfig.js';

test('timing config exposes positive battle timings', () => {
  for (const [key, value] of Object.entries(timingConfig.battle)) {
    assert.equal(typeof value, 'number', `${key} should be numeric`);
    assert.ok(value > 0, `${key} should be positive`);
  }
});
