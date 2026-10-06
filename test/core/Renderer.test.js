import test from 'node:test';
import assert from 'node:assert/strict';
import Renderer from '../../dist/core/Renderer.js';
import { makeFakeCanvas, makeFakeCtx } from '../helpers/engine.js';

test('Renderer constructor initializes with canvas', () => {
    const canvas = makeFakeCanvas();

    const renderer = new Renderer(canvas);

    assert.equal(renderer.canvas, canvas);
    assert.ok(renderer.ctx !== null);
    assert.equal(renderer.viewport, null);
});

test('Renderer constructor accepts custom context', () => {
    const canvas = makeFakeCanvas();
    const ctx = makeFakeCtx();

    const renderer = new Renderer(canvas, ctx);

    assert.equal(renderer.ctx, ctx);
});

test('setViewport updates viewport property', () => {
    const renderer = new Renderer(makeFakeCanvas());
    const viewport = { scale: 2, offsetX: 10, offsetY: 20 };

    renderer.setViewport(viewport);

    assert.equal(renderer.viewport, viewport);
});

test('clear clears the canvas', () => {
    const canvas = makeFakeCanvas();
    const ctx = makeFakeCtx();
    const renderer = new Renderer(canvas, ctx);

    renderer.clear();

    const clearOps = ctx.ops.filter(op => op[0] === 'clearRect');
    assert.equal(clearOps.length, 1);
    assert.deepEqual(clearOps[0], ['clearRect', 0, 0, 800, 600]);
});

test('clear saves and restores context', () => {
    const canvas = makeFakeCanvas();
    const ctx = makeFakeCtx();
    const renderer = new Renderer(canvas, ctx);

    renderer.clear();

    assert.ok(ctx.ops.some(op => op[0] === 'save'));
    assert.ok(ctx.ops.some(op => op[0] === 'restore'));
});

test('shake sets intensity and duration', () => {
    const renderer = new Renderer(makeFakeCanvas());

    renderer.shake(10, 0.5);

    assert.equal(renderer.screenShake.intensity, 10);
    assert.equal(renderer.screenShake.duration, 0.5);
    assert.equal(renderer.screenShake.elapsed, 0);
});

test('shake does nothing when intensity is zero', () => {
    const renderer = new Renderer(makeFakeCanvas());
    renderer.screenShake.intensity = 5;

    renderer.shake(0, 0.5);

    assert.equal(renderer.screenShake.intensity, 5);
});

test('shake does nothing when duration is zero', () => {
    const renderer = new Renderer(makeFakeCanvas());
    renderer.screenShake.duration = 1;

    renderer.shake(10, 0);

    assert.equal(renderer.screenShake.duration, 1);
});

test('updateShake increments elapsed time', () => {
    const renderer = new Renderer(makeFakeCanvas());
    renderer.shake(10, 1);

    renderer.updateShake(0.1);

    assert.equal(renderer.screenShake.elapsed, 0.1);
});

test('updateShake resets shake when duration exceeded', () => {
    const renderer = new Renderer(makeFakeCanvas());
    renderer.shake(10, 0.5);

    renderer.updateShake(0.6);

    assert.equal(renderer.screenShake.duration, 0);
    assert.equal(renderer.screenShake.intensity, 0);
});

test('getShakeOffset returns zero when no shake active', () => {
    const renderer = new Renderer(makeFakeCanvas());

    const offset = renderer.getShakeOffset();

    assert.equal(offset.x, 0);
    assert.equal(offset.y, 0);
});

test('getShakeOffset returns non-zero when shake is active', () => {
    const renderer = new Renderer(makeFakeCanvas());
    renderer.shake(10, 1);
    renderer.updateShake(0.1);

    const offset = renderer.getShakeOffset();

    assert.ok(offset.x !== 0 || offset.y !== 0);
});

test('getShakeOffset decreases over time', () => {
    const renderer = new Renderer(makeFakeCanvas());
    renderer.shake(10, 1);
    renderer.updateShake(0.1);
    const offset1 = renderer.getShakeOffset();
    renderer.updateShake(0.4);
    const offset2 = renderer.getShakeOffset();

    const magnitude1 = Math.abs(offset1.x) + Math.abs(offset1.y);
    const magnitude2 = Math.abs(offset2.x) + Math.abs(offset2.y);
    assert.ok(magnitude2 < magnitude1);
});

test('beginFrame clears canvas and sets transform', () => {
    const canvas = makeFakeCanvas();
    const ctx = makeFakeCtx();
    const renderer = new Renderer(canvas, ctx);
    renderer.setViewport({ scale: 2, offsetX: 10, offsetY: 20 });

    renderer.beginFrame();

    assert.ok(ctx.ops.some(op => op[0] === 'clearRect'));
    assert.ok(ctx.ops.some(op => op[0] === 'setTransform'));
    assert.ok(ctx.ops.some(op => op[0] === 'save'));
});

test('endFrame restores context', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);

    renderer.endFrame();

    assert.ok(ctx.ops.some(op => op[0] === 'restore'));
});

test('registerLayer stores callback', () => {
    const renderer = new Renderer(makeFakeCanvas());
    const callback = () => {};

    renderer.registerLayer('background', callback);

    assert.equal(renderer.layers.get('background'), callback);
});

test('drawLayer calls registered callback', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);
    let called = false;
    const callback = (context) => {
        called = true;
        assert.equal(context, ctx);
    };
    renderer.registerLayer('test', callback);

    renderer.drawLayer('test');

    assert.ok(called);
});

test('drawLayer does nothing for unregistered layer', () => {
    const renderer = new Renderer(makeFakeCanvas());

    renderer.drawLayer('nonexistent');

    assert.ok(true);
});

test('drawEntities draws all entities', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);
    let drawCount = 0;
    const entities = [
        { draw: () => { drawCount++; } },
        { draw: () => { drawCount++; } },
        { draw: () => { drawCount++; } },
    ];

    renderer.drawEntities(entities);

    assert.equal(drawCount, 3);
});

test('drawEntities does nothing for empty array', () => {
    const renderer = new Renderer(makeFakeCanvas());

    renderer.drawEntities([]);

    assert.ok(true);
});

test('drawEntities sorts by depth when requested', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);
    const order = [];
    const entities = [
        { y: 30, h: 10, draw: () => { order.push(2); } },
        { y: 10, h: 5, draw: () => { order.push(1); } },
        { y: 50, h: 0, draw: () => { order.push(3); } },
    ];

    renderer.drawEntities(entities, true);

    assert.deepEqual(order, [1, 2, 3]);
});

test('drawEntities does not sort when sortByDepth is false', () => {
    const renderer = new Renderer(makeFakeCanvas());
    const order = [];
    const entities = [
        { y: 30, draw: () => { order.push(1); } },
        { y: 10, draw: () => { order.push(2); } },
        { y: 50, draw: () => { order.push(3); } },
    ];

    renderer.drawEntities(entities, false);

    assert.deepEqual(order, [1, 2, 3]);
});

test('drawParticles draws all particles', () => {
    const renderer = new Renderer(makeFakeCanvas());
    let drawCount = 0;
    const particles = [
        { draw: () => { drawCount++; } },
        { draw: () => { drawCount++; } },
    ];

    renderer.drawParticles(particles);

    assert.equal(drawCount, 2);
});

test('fillRect draws filled rectangle', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);

    renderer.fillRect(10, 20, 30, 40, '#ff0000');

    assert.ok(ctx.ops.some(op => op[0] === 'fillStyle' && op[1] === '#ff0000'));
    assert.ok(ctx.ops.some(op =>
        op[0] === 'fillRect' && op[1] === 10 && op[2] === 20 && op[3] === 30 && op[4] === 40
    ));
});

test('strokeRect draws outlined rectangle', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);

    renderer.strokeRect(10, 20, 30, 40, '#00ff00', 2);

    assert.ok(ctx.ops.some(op => op[0] === 'strokeStyle' && op[1] === '#00ff00'));
    assert.ok(ctx.ops.some(op => op[0] === 'lineWidth' && op[1] === 2));
    assert.ok(ctx.ops.some(op =>
        op[0] === 'strokeRect' && op[1] === 10 && op[2] === 20 && op[3] === 30 && op[4] === 40
    ));
});

test('drawCircle draws filled circle', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);

    renderer.drawCircle(50, 60, 15, '#0000ff');

    assert.ok(ctx.ops.some(op => op[0] === 'beginPath'));
    assert.ok(ctx.ops.some(op =>
        op[0] === 'arc' && op[1] === 50 && op[2] === 60 && op[3] === 15
    ));
    assert.ok(ctx.ops.some(op => op[0] === 'fillStyle' && op[1] === '#0000ff'));
    assert.ok(ctx.ops.some(op => op[0] === 'fill'));
});

test('drawCircle draws stroked circle', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);

    renderer.drawCircle(50, 60, 15, null, '#ff00ff', 3);

    assert.ok(ctx.ops.some(op => op[0] === 'strokeStyle' && op[1] === '#ff00ff'));
    assert.ok(ctx.ops.some(op => op[0] === 'lineWidth' && op[1] === 3));
    assert.ok(ctx.ops.some(op => op[0] === 'stroke'));
});

test('drawText draws text with default options', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);

    renderer.drawText('Hello', 100, 200);

    assert.ok(ctx.ops.some(op => op[0] === 'fillText' && op[1] === 'Hello' && op[2] === 100 && op[3] === 200));
});

test('drawText uses custom font and color', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);

    renderer.drawText('Test', 50, 75, { font: '24px Arial', fillColor: '#123456' });

    assert.ok(ctx.ops.some(op => op[0] === 'font' && op[1] === '24px Arial'));
    assert.ok(ctx.ops.some(op => op[0] === 'fillStyle' && op[1] === '#123456'));
});

test('drawText draws stroke when strokeColor provided', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);

    renderer.drawText('Outline', 50, 75, { strokeColor: '#ffffff', strokeWidth: 3 });

    assert.ok(ctx.ops.some(op => op[0] === 'strokeStyle' && op[1] === '#ffffff'));
    assert.ok(ctx.ops.some(op => op[0] === 'lineWidth' && op[1] === 3));
    assert.ok(ctx.ops.some(op => op[0] === 'strokeText'));
});

test('drawText respects text alignment', () => {
    const ctx = makeFakeCtx();
    const renderer = new Renderer(makeFakeCanvas(), ctx);

    renderer.drawText('Centered', 50, 75, { align: 'center', baseline: 'middle' });

    assert.ok(ctx.ops.some(op => op[0] === 'textAlign' && op[1] === 'center'));
    assert.ok(ctx.ops.some(op => op[0] === 'textBaseline' && op[1] === 'middle'));
});

test('computeSortKey returns y position when no height', () => {
    const renderer = new Renderer(makeFakeCanvas());
    const entity = { y: 100 };

    const key = renderer.computeSortKey(entity);

    assert.equal(key, 100);
});

test('computeSortKey returns y plus height', () => {
    const renderer = new Renderer(makeFakeCanvas());
    const entity = { y: 100, h: 50 };

    const key = renderer.computeSortKey(entity);

    assert.equal(key, 150);
});

test('computeSortKey handles missing properties', () => {
    const renderer = new Renderer(makeFakeCanvas());
    const entity = {};

    const key = renderer.computeSortKey(entity);

    assert.equal(key, 0);
});
