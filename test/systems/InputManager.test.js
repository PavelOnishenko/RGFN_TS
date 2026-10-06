import test from 'node:test';
import assert from 'node:assert/strict';
import InputManager from '../../dist/systems/InputManager.js';

test('InputManager constructor initializes with default state', () => {
    const input = new InputManager();

    assert.ok(input !== null);
});

test('isKeyDown returns false for unpressed key', () => {
    const input = new InputManager();

    const result = input.isKeyDown('KeyA');

    assert.equal(result, false);
});

test('isKeyDown returns true when key is pressed', () => {
    const input = new InputManager();
    input.handleKeyDown({ code: 'KeyA' });

    const result = input.isKeyDown('KeyA');

    assert.equal(result, true);
});

test('isKeyDown returns false after key is released', () => {
    const input = new InputManager();
    input.handleKeyDown({ code: 'KeyA' });
    input.handleKeyUp({ code: 'KeyA' });

    const result = input.isKeyDown('KeyA');

    assert.equal(result, false);
});

test('wasPressed returns true only on first frame after key press', () => {
    const input = new InputManager();
    input.handleKeyDown({ code: 'KeyA' });

    const firstFrame = input.wasPressed('KeyA');
    input.update();
    const secondFrame = input.wasPressed('KeyA');

    assert.equal(firstFrame, true);
    assert.equal(secondFrame, false);
});

test('wasPressed returns false when key is not pressed', () => {
    const input = new InputManager();

    const result = input.wasPressed('KeyA');

    assert.equal(result, false);
});

test('wasReleased returns true only on first frame after key release', () => {
    const input = new InputManager();
    input.handleKeyDown({ code: 'KeyA' });
    input.update();
    input.handleKeyUp({ code: 'KeyA' });

    const firstFrame = input.wasReleased('KeyA');
    input.update();
    const secondFrame = input.wasReleased('KeyA');

    assert.equal(firstFrame, true);
    assert.equal(secondFrame, false);
});

test('wasReleased returns false when key was not released', () => {
    const input = new InputManager();

    const result = input.wasReleased('KeyA');

    assert.equal(result, false);
});

test('mapAction associates action with single key', () => {
    const input = new InputManager();
    input.mapAction('jump', ['Space']);
    input.handleKeyDown({ code: 'Space' });

    const result = input.isActionActive('jump');

    assert.equal(result, true);
});

test('mapAction associates action with multiple keys', () => {
    const input = new InputManager();
    input.mapAction('jump', ['Space', 'KeyW']);
    input.handleKeyDown({ code: 'KeyW' });

    const result = input.isActionActive('jump');

    assert.equal(result, true);
});

test('isActionActive returns false for unmapped action', () => {
    const input = new InputManager();

    const result = input.isActionActive('nonexistent');

    assert.equal(result, false);
});

test('isActionActive returns false when no mapped keys are pressed', () => {
    const input = new InputManager();
    input.mapAction('jump', ['Space']);

    const result = input.isActionActive('jump');

    assert.equal(result, false);
});

test('isActionActive returns true when any mapped key is pressed', () => {
    const input = new InputManager();
    input.mapAction('attack', ['KeyZ', 'KeyX', 'KeyC']);
    input.handleKeyDown({ code: 'KeyX' });

    const result = input.isActionActive('attack');

    assert.equal(result, true);
});

test('getAxis returns 0 for unmapped axis', () => {
    const input = new InputManager();

    const result = input.getAxis('horizontal');

    assert.equal(result, 0);
});

test('getAxis returns -1 when negative key is pressed', () => {
    const input = new InputManager();
    input.mapAxis('horizontal', ['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD']);
    input.handleKeyDown({ code: 'ArrowLeft' });

    const result = input.getAxis('horizontal');

    assert.equal(result, -1);
});

test('getAxis returns 1 when positive key is pressed', () => {
    const input = new InputManager();
    input.mapAxis('horizontal', ['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD']);
    input.handleKeyDown({ code: 'ArrowRight' });

    const result = input.getAxis('horizontal');

    assert.equal(result, 1);
});

test('getAxis returns 0 when both positive and negative keys pressed', () => {
    const input = new InputManager();
    input.mapAxis('horizontal', ['ArrowLeft'], ['ArrowRight']);
    input.handleKeyDown({ code: 'ArrowLeft' });
    input.handleKeyDown({ code: 'ArrowRight' });

    const result = input.getAxis('horizontal');

    assert.equal(result, 0);
});

test('getAxis returns 0 when no axis keys are pressed', () => {
    const input = new InputManager();
    input.mapAxis('horizontal', ['ArrowLeft'], ['ArrowRight']);

    const result = input.getAxis('horizontal');

    assert.equal(result, 0);
});

test('update clears pressed state for next frame', () => {
    const input = new InputManager();
    input.handleKeyDown({ code: 'KeyA' });
    const firstCheck = input.wasPressed('KeyA');

    input.update();
    const secondCheck = input.wasPressed('KeyA');

    assert.equal(firstCheck, true);
    assert.equal(secondCheck, false);
});

test('update clears released state for next frame', () => {
    const input = new InputManager();
    input.handleKeyDown({ code: 'KeyA' });
    input.update();
    input.handleKeyUp({ code: 'KeyA' });
    const firstCheck = input.wasReleased('KeyA');

    input.update();
    const secondCheck = input.wasReleased('KeyA');

    assert.equal(firstCheck, true);
    assert.equal(secondCheck, false);
});

test('reset clears all key states', () => {
    const input = new InputManager();
    input.handleKeyDown({ code: 'KeyA' });
    input.handleKeyDown({ code: 'KeyB' });

    input.reset();

    assert.equal(input.isKeyDown('KeyA'), false);
    assert.equal(input.isKeyDown('KeyB'), false);
});

test('handleKeyDown ignores repeat events by default for backward compatibility', () => {
    const input = new InputManager();
    input.handleKeyDown({ code: 'KeyA', repeat: false });
    input.update();
    input.handleKeyDown({ code: 'KeyA', repeat: true });

    assert.equal(input.wasPressed('KeyA'), false);
    assert.equal(input.isKeyDown('KeyA'), true);
});

test('handleKeyDown uses repeat events as press pulses when repeat mode is enabled', () => {
    const input = new InputManager({ enableRepeatPress: true });
    input.handleKeyDown({ code: 'KeyA', repeat: false });
    const firstPress = input.wasPressed('KeyA');
    input.update();
    input.handleKeyDown({ code: 'KeyA', repeat: true });
    const repeatedPress = input.wasPressed('KeyA');

    assert.equal(firstPress, true);
    assert.equal(repeatedPress, true);
    assert.equal(input.isKeyDown('KeyA'), true);
});

test('handleKeyDown handles missing event code gracefully', () => {
    const input = new InputManager();

    input.handleKeyDown({});

    assert.ok(true);
});

test('handleKeyUp handles missing event code gracefully', () => {
    const input = new InputManager();

    input.handleKeyUp({});

    assert.ok(true);
});

test('multiple keys can be pressed simultaneously', () => {
    const input = new InputManager();
    input.handleKeyDown({ code: 'KeyA' });
    input.handleKeyDown({ code: 'KeyB' });
    input.handleKeyDown({ code: 'KeyC' });

    assert.equal(input.isKeyDown('KeyA'), true);
    assert.equal(input.isKeyDown('KeyB'), true);
    assert.equal(input.isKeyDown('KeyC'), true);
});

test('mapAction overwrites previous mapping', () => {
    const input = new InputManager();
    input.mapAction('jump', ['Space']);
    input.mapAction('jump', ['KeyW']);
    input.handleKeyDown({ code: 'Space' });

    const spaceResult = input.isActionActive('jump');
    input.handleKeyUp({ code: 'Space' });
    input.handleKeyDown({ code: 'KeyW' });
    const wResult = input.isActionActive('jump');

    assert.equal(spaceResult, false);
    assert.equal(wResult, true);
});

test('mapAxis overwrites previous mapping', () => {
    const input = new InputManager();
    input.mapAxis('horizontal', ['ArrowLeft'], ['ArrowRight']);
    input.mapAxis('horizontal', ['KeyA'], ['KeyD']);
    input.handleKeyDown({ code: 'ArrowLeft' });

    const arrowResult = input.getAxis('horizontal');
    input.handleKeyUp({ code: 'ArrowLeft' });
    input.handleKeyDown({ code: 'KeyA' });
    const aResult = input.getAxis('horizontal');

    assert.equal(arrowResult, 0);
    assert.equal(aResult, -1);
});

test('getAxis with alternate positive key', () => {
    const input = new InputManager();
    input.mapAxis('horizontal', ['ArrowLeft'], ['ArrowRight', 'KeyD']);
    input.handleKeyDown({ code: 'KeyD' });

    const result = input.getAxis('horizontal');

    assert.equal(result, 1);
});

test('getAxis with alternate negative key', () => {
    const input = new InputManager();
    input.mapAxis('horizontal', ['ArrowLeft', 'KeyA'], ['ArrowRight']);
    input.handleKeyDown({ code: 'KeyA' });

    const result = input.getAxis('horizontal');

    assert.equal(result, -1);
});

test('wasActionPressed returns true only on first frame', () => {
    const input = new InputManager();
    input.mapAction('jump', ['Space']);
    input.handleKeyDown({ code: 'Space' });

    const firstFrame = input.wasActionPressed('jump');
    input.update();
    const secondFrame = input.wasActionPressed('jump');

    assert.equal(firstFrame, true);
    assert.equal(secondFrame, false);
});

test('wasActionPressed returns false for unmapped action', () => {
    const input = new InputManager();

    const result = input.wasActionPressed('nonexistent');

    assert.equal(result, false);
});

test('wasActionReleased returns true only on first frame', () => {
    const input = new InputManager();
    input.mapAction('jump', ['Space']);
    input.handleKeyDown({ code: 'Space' });
    input.update();
    input.handleKeyUp({ code: 'Space' });

    const firstFrame = input.wasActionReleased('jump');
    input.update();
    const secondFrame = input.wasActionReleased('jump');

    assert.equal(firstFrame, true);
    assert.equal(secondFrame, false);
});

test('wasActionReleased returns false for unmapped action', () => {
    const input = new InputManager();

    const result = input.wasActionReleased('nonexistent');

    assert.equal(result, false);
});
