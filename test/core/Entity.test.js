import test from 'node:test';
import assert from 'node:assert/strict';
import Entity from '../../dist/core/Entity.js';

test('Entity constructor initializes with x and y position', () => {
    const entity = new Entity(100, 200);

    assert.equal(entity.x, 100);
    assert.equal(entity.y, 200);
});

test('Entity constructor initializes default properties', () => {
    const entity = new Entity(0, 0);

    assert.equal(entity.width, 32);
    assert.equal(entity.height, 32);
    assert.equal(entity.velocityX, 0);
    assert.equal(entity.velocityY, 0);
    assert.equal(entity.active, true);
});

test('Entity constructor generates unique id', () => {
    const entity1 = new Entity(0, 0);
    const entity2 = new Entity(0, 0);

    assert.ok(entity1.id !== undefined);
    assert.ok(entity2.id !== undefined);
    assert.notEqual(entity1.id, entity2.id);
});

test('move updates position based on velocity and deltaTime', () => {
    const entity = new Entity(100, 200);
    entity.velocityX = 50;
    entity.velocityY = -30;

    entity.move(0.1);

    assert.equal(entity.x, 105);
    assert.equal(entity.y, 197);
});

test('move handles zero velocity', () => {
    const entity = new Entity(100, 200);
    entity.velocityX = 0;
    entity.velocityY = 0;

    entity.move(0.1);

    assert.equal(entity.x, 100);
    assert.equal(entity.y, 200);
});

test('move handles zero deltaTime', () => {
    const entity = new Entity(100, 200);
    entity.velocityX = 50;
    entity.velocityY = -30;

    entity.move(0);

    assert.equal(entity.x, 100);
    assert.equal(entity.y, 200);
});

test('move handles negative velocity', () => {
    const entity = new Entity(100, 200);
    entity.velocityX = -25;
    entity.velocityY = -40;

    entity.move(0.5);

    assert.equal(entity.x, 87.5);
    assert.equal(entity.y, 180);
});

test('getBounds returns correct bounds centered on position', () => {
    const entity = new Entity(100, 200);
    entity.width = 40;
    entity.height = 60;

    const bounds = entity.getBounds();

    assert.equal(bounds.left, 80);
    assert.equal(bounds.right, 120);
    assert.equal(bounds.top, 170);
    assert.equal(bounds.bottom, 230);
});

test('getBounds handles zero dimensions', () => {
    const entity = new Entity(100, 200);
    entity.width = 0;
    entity.height = 0;

    const bounds = entity.getBounds();

    assert.equal(bounds.left, 100);
    assert.equal(bounds.right, 100);
    assert.equal(bounds.top, 200);
    assert.equal(bounds.bottom, 200);
});

test('checkCollision returns true when entities overlap', () => {
    const entity1 = new Entity(100, 100);
    entity1.width = 40;
    entity1.height = 40;
    const entity2 = new Entity(110, 110);
    entity2.width = 40;
    entity2.height = 40;

    const collision = entity1.checkCollision(entity2);

    assert.equal(collision, true);
});

test('checkCollision returns false when entities do not overlap', () => {
    const entity1 = new Entity(100, 100);
    entity1.width = 40;
    entity1.height = 40;
    const entity2 = new Entity(200, 200);
    entity2.width = 40;
    entity2.height = 40;

    const collision = entity1.checkCollision(entity2);

    assert.equal(collision, false);
});

test('checkCollision returns false when entities touch edges', () => {
    const entity1 = new Entity(100, 100);
    entity1.width = 40;
    entity1.height = 40;
    const entity2 = new Entity(140, 100);
    entity2.width = 40;
    entity2.height = 40;

    const collision = entity1.checkCollision(entity2);

    assert.equal(collision, false);
});

test('checkCollision returns true when entity1 is left of entity2', () => {
    const entity1 = new Entity(100, 100);
    entity1.width = 40;
    entity1.height = 40;
    const entity2 = new Entity(115, 100);
    entity2.width = 40;
    entity2.height = 40;

    const collision = entity1.checkCollision(entity2);

    assert.equal(collision, true);
});

test('checkCollision returns true when entity1 is above entity2', () => {
    const entity1 = new Entity(100, 100);
    entity1.width = 40;
    entity1.height = 40;
    const entity2 = new Entity(100, 115);
    entity2.width = 40;
    entity2.height = 40;

    const collision = entity1.checkCollision(entity2);

    assert.equal(collision, true);
});

test('checkCollision returns true when entity1 contains entity2', () => {
    const entity1 = new Entity(100, 100);
    entity1.width = 100;
    entity1.height = 100;
    const entity2 = new Entity(100, 100);
    entity2.width = 20;
    entity2.height = 20;

    const collision = entity1.checkCollision(entity2);

    assert.equal(collision, true);
});

test('update method exists and can be called', () => {
    const entity = new Entity(0, 0);

    entity.update(0.016);

    assert.ok(true);
});

test('draw method exists and can be called', () => {
    const entity = new Entity(0, 0);

    entity.draw({}, {});

    assert.ok(true);
});

test('Entity can be subclassed and override update', () => {
    class TestEntity extends Entity {
        constructor(x, y) {
            super(x, y);
            this.updateCalled = false;
        }

        update(deltaTime) {
            this.updateCalled = true;
            this.x += 10 * deltaTime;
        }
    }

    const entity = new TestEntity(100, 200);
    entity.update(1);

    assert.equal(entity.updateCalled, true);
    assert.equal(entity.x, 110);
});

test('Entity can be subclassed and override draw', () => {
    class TestEntity extends Entity {
        constructor(x, y) {
            super(x, y);
            this.drawCalled = false;
        }

        draw(ctx, viewport) {
            this.drawCalled = true;
        }
    }

    const entity = new TestEntity(100, 200);
    entity.draw({}, {});

    assert.equal(entity.drawCalled, true);
});

test('active property can be set and read', () => {
    const entity = new Entity(0, 0);

    entity.active = false;

    assert.equal(entity.active, false);
});

test('width and height can be modified', () => {
    const entity = new Entity(0, 0);

    entity.width = 64;
    entity.height = 128;

    assert.equal(entity.width, 64);
    assert.equal(entity.height, 128);
});

test('velocity can be modified', () => {
    const entity = new Entity(0, 0);

    entity.velocityX = 123.45;
    entity.velocityY = -67.89;

    assert.equal(entity.velocityX, 123.45);
    assert.equal(entity.velocityY, -67.89);
});
