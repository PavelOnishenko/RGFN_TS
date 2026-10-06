let entityIdCounter = 1;

export default class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.velocityX = 0;
        this.velocityY = 0;
        this.active = true;
        this.id = generateEntityId();
    }

    update(deltaTime) {
        // Override in subclasses
    }

    draw(ctx, viewport) {
        // Override in subclasses
    }

    move(deltaTime) {
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
    }

    getBounds() {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        return {
            left: this.x - halfWidth,
            right: this.x + halfWidth,
            top: this.y - halfHeight,
            bottom: this.y + halfHeight,
        };
    }

    checkCollision(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        const noOverlap = a.right <= b.left
            || a.left >= b.right
            || a.bottom <= b.top
            || a.top >= b.bottom;

        return !noOverlap;
    }
}

function generateEntityId() {
    const id = entityIdCounter;
    entityIdCounter += 1;
    return id;
}
