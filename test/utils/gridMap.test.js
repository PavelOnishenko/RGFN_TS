import test from 'node:test';
import assert from 'node:assert/strict';

import GridMap from '../../dist/utils/GridMap.js';

test('GridMap initializes cells and dimensions', () => {
  const grid = new GridMap(3, 2, 10, 5, 7);

  assert.equal(grid.getAllCells().length, 6);
  assert.deepEqual(grid.getDimensions(), { columns: 3, rows: 2, width: 30, height: 20 });
});

test('GridMap position conversion and lookup methods', () => {
  const grid = new GridMap(2, 2, 20, 10, 10);

  assert.deepEqual(grid.pixelToGrid(15, 15), [0, 0]);
  assert.deepEqual(grid.gridToPixel(1, 1), [40, 40]);
  assert.equal(grid.getCellAtPixel(15, 15)?.col, 0);
  assert.equal(grid.getCellAt(-1, 0), null);
});

test('GridMap distance and adjacency checks', () => {
  const grid = new GridMap(5, 5, 10);

  assert.equal(grid.getDistance(1, 1, 3, 2), 3);
  assert.equal(grid.areAdjacent(2, 2, 2, 3), true);
  assert.equal(grid.areAdjacent(2, 2, 3, 3), false);
});

test('GridMap clears cell data for all cells', () => {
  const grid = new GridMap(2, 1, 10);
  grid.getCellAt(0, 0).data.foo = 'bar';
  grid.getCellAt(1, 0).data.bar = 'baz';

  grid.clearCellData();

  assert.deepEqual(grid.getCellAt(0, 0).data, {});
  assert.deepEqual(grid.getCellAt(1, 0).data, {});
});


test('GridMap updateLayout reuses cell objects while updating offsets and scale', () => {
  const grid = new GridMap(2, 2, 10, 0, 0);
  const originalCell = grid.getCellAt(1, 1);

  grid.updateLayout(10, 5, 7);
  assert.equal(grid.getCellAt(1, 1), originalCell);
  assert.deepEqual({ x: originalCell.x, y: originalCell.y, width: originalCell.width, height: originalCell.height }, {
    x: 15,
    y: 17,
    width: 10,
    height: 10,
  });

  grid.updateLayout(20, 3, 4);
  assert.equal(grid.getCellAt(1, 1), originalCell);
  assert.deepEqual({ x: originalCell.x, y: originalCell.y, width: originalCell.width, height: originalCell.height }, {
    x: 23,
    y: 24,
    width: 20,
    height: 20,
  });
});
