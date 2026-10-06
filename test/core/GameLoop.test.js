import test from 'node:test';
import assert from 'node:assert/strict';
import GameLoop from '../../dist/core/GameLoop.js';

test('GameLoop constructor accepts update and render callbacks', () => {
    const updateCallback = () => {};
    const renderCallback = () => {};

    const loop = new GameLoop(updateCallback, renderCallback);

    assert.ok(loop !== null);
});

test('GameLoop initializes with isPaused false', () => {
    const loop = new GameLoop(() => {}, () => {});

    assert.equal(loop.isPaused, false);
});

test('GameLoop initializes with timeScale 1', () => {
    const loop = new GameLoop(() => {}, () => {});

    assert.equal(loop.timeScale, 1);
});

test('pause sets isPaused to true', () => {
    const loop = new GameLoop(() => {}, () => {});

    loop.pause();

    assert.equal(loop.isPaused, true);
});

test('pause stores the reason', () => {
    const loop = new GameLoop(() => {}, () => {});

    loop.pause('testing');

    assert.equal(loop.pauseReason, 'testing');
});

test('pause defaults to manual reason', () => {
    const loop = new GameLoop(() => {}, () => {});

    loop.pause();

    assert.equal(loop.pauseReason, 'manual');
});

test('resume sets isPaused to false', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.pause();

    loop.resume();

    assert.equal(loop.isPaused, false);
});

test('resume clears the pause reason', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.pause('testing');

    loop.resume();

    assert.equal(loop.pauseReason, null);
});

test('resume does nothing when not paused', () => {
    const loop = new GameLoop(() => {}, () => {});

    const result = loop.resume();

    assert.equal(result, false);
    assert.equal(loop.isPaused, false);
});

test('setTimeScale updates timeScale property', () => {
    const loop = new GameLoop(() => {}, () => {});

    loop.setTimeScale(2);

    assert.equal(loop.timeScale, 2);
});

test('setTimeScale clamps to minimum 0.1', () => {
    const loop = new GameLoop(() => {}, () => {});

    loop.setTimeScale(0.05);

    assert.equal(loop.timeScale, 0.1);
});

test('setTimeScale clamps to maximum 10', () => {
    const loop = new GameLoop(() => {}, () => {});

    loop.setTimeScale(15);

    assert.equal(loop.timeScale, 10);
});

test('setTimeScale handles negative values', () => {
    const loop = new GameLoop(() => {}, () => {});

    loop.setTimeScale(-5);

    assert.equal(loop.timeScale, 0.1);
});

test('setTimeScale handles NaN', () => {
    const loop = new GameLoop(() => {}, () => {});

    loop.setTimeScale(NaN);

    assert.equal(loop.timeScale, 1);
});

test('setTimeScale returns clamped value', () => {
    const loop = new GameLoop(() => {}, () => {});

    const result = loop.setTimeScale(0.5);

    assert.equal(result, 0.5);
});

test('getTimeScale returns current timeScale', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.timeScale = 2;

    const result = loop.getTimeScale();

    assert.equal(result, 2);
});

test('getTimeScale returns 1 when timeScale is undefined', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.timeScale = undefined;

    const result = loop.getTimeScale();

    assert.equal(result, 1);
});

test('calcDelta returns time difference in seconds', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.lastTime = 1000;

    const delta = loop.calcDelta(1100);

    assert.equal(delta, 0.1);
});

test('calcDelta updates lastTime', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.lastTime = 1000;

    loop.calcDelta(1100);

    assert.equal(loop.lastTime, 1100);
});

test('calcDelta applies timeScale', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.lastTime = 1000;
    loop.timeScale = 2;

    const delta = loop.calcDelta(1100);

    assert.equal(delta, 0.2);
});

test('calcDelta handles first frame with zero lastTime', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.lastTime = 0;

    const delta = loop.calcDelta(1000);

    assert.ok(delta >= 0);
});

test('calcDelta clamps negative delta to zero', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.lastTime = 2000;

    const delta = loop.calcDelta(1000);

    assert.equal(delta, 0);
});

test('calcDelta updates elapsedTime', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.lastTime = 1000;
    loop.elapsedTime = 5;

    loop.calcDelta(1100);

    assert.equal(loop.elapsedTime, 5.1);
});

test('calcDelta initializes elapsedTime if undefined', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.lastTime = 1000;

    loop.calcDelta(1100);

    assert.ok(loop.elapsedTime >= 0);
});

test('stop sets isRunning to false', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.isRunning = true;

    loop.stop();

    assert.equal(loop.isRunning, false);
});

test('isRunning starts as false', () => {
    const loop = new GameLoop(() => {}, () => {});

    assert.equal(loop.isRunning, false);
});
