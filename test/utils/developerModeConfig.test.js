import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDeveloperModeConfig,
  isDeveloperModeEnabled,
  setDeveloperModeEnabled,
} from '../../dist/utils/DeveloperModeConfig.js';

function createLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

test('Developer mode config persists and applies expected defaults', () => {
  const originalWindow = global.window;
  global.window = { localStorage: createLocalStorage() };

  try {
    assert.equal(isDeveloperModeEnabled(), false);
    assert.equal(getDeveloperModeConfig().everythingDiscovered, false);
    assert.equal(getDeveloperModeConfig().encounterTypes.monster, true);

    const enabled = setDeveloperModeEnabled(true);
    assert.equal(enabled.enabled, true);
    assert.equal(enabled.everythingDiscovered, true);
    assert.equal(enabled.questIntroEnabled, false);
    assert.deepEqual(enabled.encounterTypes, { monster: false, item: false, traveler: false });
    assert.equal(isDeveloperModeEnabled(), true);

    const disabled = setDeveloperModeEnabled(false);
    assert.equal(disabled.enabled, false);
    assert.equal(disabled.everythingDiscovered, false);
    assert.deepEqual(disabled.encounterTypes, { monster: true, item: true, traveler: true });
  } finally {
    if (typeof originalWindow === 'undefined') {
      delete global.window;
    } else {
      global.window = originalWindow;
    }
  }
});
