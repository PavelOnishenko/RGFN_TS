const MIN_TIME_SCALE = 0.1;
const MAX_TIME_SCALE = 10;
const DEFAULT_TIME_SCALE = 1;

export default class GameLoop {
    constructor(updateCallback, renderCallback) {
        this.updateCallback = updateCallback;
        this.renderCallback = renderCallback;
        this.isPaused = false;
        this.pauseReason = null;
        this.isRunning = false;
        this.timeScale = DEFAULT_TIME_SCALE;
        this.lastTime = 0;
        this.elapsedTime = 0;
        this.animationFrameId = null;
        this.boundTick = this.tick.bind(this);
    }

    start() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.boundTick);
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    pause(reason = 'manual') {
        this.isPaused = true;
        this.pauseReason = reason;
    }

    resume() {
        if (!this.isPaused) {
            return false;
        }

        this.isPaused = false;
        this.pauseReason = null;
        return true;
    }

    setTimeScale(scale) {
        const clamped = clampTimeScale(scale);
        this.timeScale = clamped;
        return clamped;
    }

    getTimeScale() {
        const current = this.timeScale;
        if (!Number.isFinite(current)) {
            return DEFAULT_TIME_SCALE;
        }
        return current;
    }

    calcDelta(timestamp) {
        const rawDelta = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const safeDelta = Number.isFinite(rawDelta) ? rawDelta : 0;
        const clamped = Math.max(0, safeDelta);
        const timeScale = this.getTimeScale();
        const scaledDelta = clamped * timeScale;
        this.elapsedTime = (this.elapsedTime ?? 0) + scaledDelta;
        return scaledDelta;
    }

    tick(timestamp) {
        if (!this.isRunning) {
            return;
        }

        if (this.isPaused) {
            this.handlePausedTick(timestamp);
            return;
        }

        this.handleActiveTick(timestamp);
    }

    handlePausedTick(timestamp) {
        this.lastTime = timestamp;
        this.animationFrameId = requestAnimationFrame(this.boundTick);
    }

    handleActiveTick(timestamp) {
        const deltaTime = this.calcDelta(timestamp);
        this.callUpdateCallback(deltaTime, timestamp);
        this.callRenderCallback(deltaTime, timestamp);
        this.animationFrameId = requestAnimationFrame(this.boundTick);
    }

    callUpdateCallback(deltaTime, timestamp) {
        if (typeof this.updateCallback === 'function') {
            this.updateCallback(deltaTime, timestamp);
        }
    }

    callRenderCallback(deltaTime, timestamp) {
        if (typeof this.renderCallback === 'function') {
            this.renderCallback(deltaTime, timestamp);
        }
    }
}

function clampTimeScale(value) {
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) ? numeric : DEFAULT_TIME_SCALE;
    return Math.min(MAX_TIME_SCALE, Math.max(MIN_TIME_SCALE, safeValue));
}
