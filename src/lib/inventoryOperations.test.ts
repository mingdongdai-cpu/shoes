import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateBatchOutLines,
  getStockAfterTransactionDeletion
} from './inventoryOperations';

test('aggregateBatchOutLines updates each product once while preserving totals', () => {
  assert.deepEqual(
    aggregateBatchOutLines([
      { productId: 'a', boxes: 2 },
      { productId: 'b', boxes: 1 },
      { productId: 'a', boxes: 3 }
    ]),
    [
      { productId: 'a', boxes: 5 },
      { productId: 'b', boxes: 1 }
    ]
  );
});

test('deleting an outbound transaction restores stock', () => {
  assert.equal(getStockAfterTransactionDeletion(12, 'out', 5), 17);
});

test('deleting an inbound transaction removes its stock contribution', () => {
  assert.equal(getStockAfterTransactionDeletion(12, 'in', 5), 7);
});
