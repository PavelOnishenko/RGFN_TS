import test from 'node:test';
import assert from 'node:assert/strict';

import {
  configureGameRandomProvider,
  getGameRandomProviderSettings,
  initializeGameRandomProvider,
} from '../../dist/utils/RandomProvider.js';

function createLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

test('RandomProvider reproduces the same Math.random sequence for the same pseudo seed', () => {
  const originalWindow = global.window;
  const originalMathRandom = Math.random;

  global.window = { localStorage: createLocalStorage() };

  try {
    initializeGameRandomProvider();
    configureGameRandomProvider('pseudo', 'deterministic-seed');
    const firstSequence = [Math.random(), Math.random(), Math.random()];

    configureGameRandomProvider('pseudo', 'deterministic-seed');
    const secondSequence = [Math.random(), Math.random(), Math.random()];

    assert.deepEqual(secondSequence, firstSequence);
    assert.equal(getGameRandomProviderSettings().pseudoSeed, 'deterministic-seed');
  } finally {
    Math.random = originalMathRandom;
    if (typeof originalWindow === 'undefined') {
      delete global.window;
    } else {
      global.window = originalWindow;
    }
  }
});
