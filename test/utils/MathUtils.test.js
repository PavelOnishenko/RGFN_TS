import test from 'node:test';
import assert from 'node:assert/strict';
import { randomInt } from '../../dist/utils/MathUtils.js';

test('randomInt returns an integer within the inclusive range', () => {
    for (let i = 0; i < 100; i++) {
        const result = randomInt(10, 20);
        assert.ok(Number.isInteger(result));
        assert.ok(result >= 10 && result <= 20);
    }
});

test('randomInt includes both range boundaries', () => {
    const results = new Set();
    for (let i = 0; i < 1000; i++)
        results.add(randomInt(0, 1));

    assert.ok(results.has(0));
    assert.ok(results.has(1));
});
