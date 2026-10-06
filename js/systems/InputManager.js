export default class InputManager {
    constructor(options = {}) {
        this.enableRepeatPress = options.enableRepeatPress === true;
        this.keys = new Map();
        this.keysPressed = new Set();
        this.keysReleased = new Set();
        this.actions = new Map();
        this.axes = new Map();
    }

    handleKeyDown(event) {
        const code = event?.code;
        if (!code) {
            return;
        }

        if (event?.repeat) {
            // Backward-compatible default: repeated keydown does not retrigger "pressed this frame".
            // Opt-in behavior for games that want held-key repeats through wasPressed/wasActionPressed.
            if (this.enableRepeatPress && this.keys.get(code)) {
                this.keysPressed.add(code);
            }
            return;
        }

        if (!this.keys.get(code)) {
            this.keysPressed.add(code);
        }
        this.keys.set(code, true);
    }

    handleKeyUp(event) {
        const code = event?.code;
        if (!code) {
            return;
        }

        this.keys.set(code, false);
        this.keysReleased.add(code);
    }

    isKeyDown(code) {
        return this.keys.get(code) === true;
    }

    wasPressed(code) {
        var result = this.keysPressed.has(code);
        return result;
    }

    wasReleased(code) {
        return this.keysReleased.has(code);
    }

    mapAction(actionName, keyCodes) {
        this.actions.set(actionName, keyCodes);
    }

    isActionActive(actionName) {
        const keyCodes = this.actions.get(actionName);
        if (!Array.isArray(keyCodes)) {
            return false;
        }

        return keyCodes.some(code => this.isKeyDown(code));
    }

    wasActionPressed(actionName) {
        const keyCodes = this.actions.get(actionName);
        if (!Array.isArray(keyCodes)) {
            return false;
        }

        return keyCodes.some(code => this.wasPressed(code));
    }

    wasActionReleased(actionName) {
        const keyCodes = this.actions.get(actionName);
        if (!Array.isArray(keyCodes)) {
            return false;
        }

        return keyCodes.some(code => this.wasReleased(code));
    }

    mapAxis(axisName, negativeKeys, positiveKeys) {
        this.axes.set(axisName, {
            negative: negativeKeys,
            positive: positiveKeys,
        });
    }

    getAxis(axisName) {
        const axis = this.axes.get(axisName);
        if (!axis) {
            return 0;
        }

        const negativePressed = this.checkKeysPressed(axis.negative);
        const positivePressed = this.checkKeysPressed(axis.positive);

        if (negativePressed && positivePressed) {
            return 0;
        }
        if (negativePressed) {
            return -1;
        }
        if (positivePressed) {
            return 1;
        }
        return 0;
    }

    checkKeysPressed(keyCodes) {
        if (!Array.isArray(keyCodes)) {
            return false;
        }

        return keyCodes.some(code => this.isKeyDown(code));
    }

    update() {
        this.keysPressed.clear();
        this.keysReleased.clear();
    }

    reset() {
        this.keys.clear();
        this.keysPressed.clear();
        this.keysReleased.clear();
    }
}
