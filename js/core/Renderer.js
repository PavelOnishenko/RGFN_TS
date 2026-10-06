export default class Renderer {
    constructor(canvas, ctx = null) {
        this.canvas = canvas;
        this.ctx = ctx || canvas.getContext('2d');
        this.viewport = null;
        this.screenShake = {
            intensity: 0,
            duration: 0,
            elapsed: 0,
            frequency: 42,
            seedX: Math.random() * 100,
            seedY: Math.random() * 100,
        };
        this.layers = new Map();
    }

    setViewport(viewport) {
        this.viewport = viewport;
    }

    clear() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    shake(intensity, duration) {
        if (intensity <= 0 || duration <= 0) {
            return;
        }

        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
        this.screenShake.elapsed = 0;
        this.screenShake.seedX = Math.random() * 100;
        this.screenShake.seedY = Math.random() * 100;
    }

    updateShake(deltaTime) {
        if (this.screenShake.duration <= 0) {
            return;
        }

        this.screenShake.elapsed += deltaTime;
        if (this.screenShake.elapsed >= this.screenShake.duration) {
            this.screenShake.duration = 0;
            this.screenShake.intensity = 0;
        }
    }

    getShakeOffset() {
        const shake = this.screenShake;
        if (shake.duration <= 0 || shake.intensity <= 0) {
            return { x: 0, y: 0 };
        }

        const time = shake.elapsed;
        const progress = Math.min(1, shake.duration > 0 ? time / shake.duration : 1);
        const falloff = Math.pow(1 - progress, 2);
        const baseIntensity = shake.intensity * falloff;
        if (baseIntensity <= 0.01) {
            return { x: 0, y: 0 };
        }

        const frequency = shake.frequency;
        const phaseX = (time * frequency) + shake.seedX;
        const phaseY = (time * (frequency * 0.82)) + shake.seedY;
        const offsetX = Math.sin(phaseX) * baseIntensity;
        const offsetY = Math.cos(phaseY) * baseIntensity;
        return { x: offsetX, y: offsetY };
    }

    setTransform() {
        const { scale = 1, offsetX = 0, offsetY = 0 } = this.viewport ?? {};
        const shakeOffset = this.getShakeOffset();
        this.ctx.setTransform(scale, 0, 0, scale, offsetX + shakeOffset.x, offsetY + shakeOffset.y);
    }

    beginFrame() {
        this.clear();
        this.ctx.save();
        this.setTransform();
    }

    endFrame() {
        this.ctx.restore();
    }

    registerLayer(layerName, drawCallback) {
        this.layers.set(layerName, drawCallback);
    }

    drawLayer(layerName, ...args) {
        const callback = this.layers.get(layerName);
        if (typeof callback === 'function') {
            callback(this.ctx, ...args);
        }
    }

    drawEntities(entities, sortByDepth = true) {
        if (!Array.isArray(entities) || entities.length === 0) {
            return;
        }

        const entitiesToDraw = sortByDepth ? this.sortEntitiesByDepth(entities) : entities;

        entitiesToDraw.forEach(entity => {
            if (entity && typeof entity.draw === 'function') {
                entity.draw(this.ctx, this.viewport);
            }
        });
    }

    sortEntitiesByDepth(entities) {
        return [...entities].sort((a, b) => {
            const keyA = this.computeSortKey(a);
            const keyB = this.computeSortKey(b);
            return keyA - keyB;
        });
    }

    computeSortKey(entity) {
        const y = typeof entity.y === 'number' ? entity.y : 0;
        const height = typeof entity.h === 'number' ? entity.h : 0;
        const baseKey = y + height;

        // Corpses should always render behind living entities
        const isDead = entity.isDead === true || entity.animationState === 'death';
        if (isDead) {
            return baseKey - 10000;
        }

        return baseKey;
    }

    drawParticles(particles) {
        if (!Array.isArray(particles) || particles.length === 0) {
            return;
        }

        particles.forEach(particle => {
            if (particle && typeof particle.draw === 'function') {
                particle.draw(this.ctx);
            }
        });
    }

    fillRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }

    strokeRect(x, y, width, height, color, lineWidth = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(x, y, width, height);
    }

    drawCircle(x, y, radius, fillColor = null, strokeColor = null, lineWidth = 1) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);

        if (fillColor) {
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
        }

        if (strokeColor) {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = lineWidth;
            this.ctx.stroke();
        }
    }

    drawText(text, x, y, options = {}) {
        const font = options.font || '16px sans-serif';
        const fillColor = options.fillColor || '#000';
        const strokeColor = options.strokeColor || null;
        const strokeWidth = options.strokeWidth || 2;
        const align = options.align || 'left';
        const baseline = options.baseline || 'alphabetic';

        this.ctx.save();
        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;

        if (strokeColor && typeof this.ctx.strokeText === 'function') {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.strokeText(text, x, y);
        }

        if (typeof this.ctx.fillText === 'function') {
            this.ctx.fillStyle = fillColor;
            this.ctx.fillText(text, x, y);
        }

        this.ctx.restore();
    }
}
