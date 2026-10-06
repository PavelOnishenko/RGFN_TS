import test from 'node:test';
import assert from 'node:assert/strict';

import Item, { ITEM_LIBRARY } from '../../dist/entities/Item.js';

test('Item defaults attack range to 1 when omitted', () => {
  const item = new Item({ id: 'test-dagger', name: 'Dagger', description: 'Small blade', type: 'weapon' });

  assert.equal(item.attackRange, 1);
});

test('Generated bow tier 1 data can build an item with range 2', () => {
  const bowTier1 = ITEM_LIBRARY.find((item) => item.id === 'bow_t1');

  assert.ok(bowTier1);
  const bow = new Item(bowTier1);

  assert.equal(bow.name, 'Bow +1');
  assert.equal(bow.attackRange, 2);
  assert.equal(bow.handsRequired, 2);
});
