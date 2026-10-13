import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTopProducts, calculateSalesMoM, getPreviousMonthKey } from './groupOverview';

test('getPreviousMonthKey steps back one month across years', () => {
  assert.equal(getPreviousMonthKey('2026-10'), '2026-09');
  assert.equal(getPreviousMonthKey('2027-01'), '2026-12');
});

test('calculateSalesMoM returns null without previous sales', () => {
  assert.equal(calculateSalesMoM(120, 100), 20);
  assert.equal(calculateSalesMoM(50, 0), null);
});

test('buildTopProducts ranks by amount and converts quantity to boxes', () => {
  const products = new Map([
    ['a', { name: 'AJ1', spec: 12 }],
    ['b', { name: 'NB550', spec: 10 }]
  ]);
  const top = buildTopProducts({
    outAmount: 0,
    expenseAmount: 0,
    outByProduct: {
      a: { quantity: 24, amount: 50000 },
      b: { quantity: 15, amount: 90000 },
      c: { quantity: 3, amount: 1000 },
      d: { quantity: 0, amount: 0 }
    }
  }, products, 2);
  assert.deepEqual(top, [
    { productId: 'b', name: 'NB550', amount: 90000, boxes: 1.5 },
    { productId: 'a', name: 'AJ1', amount: 50000, boxes: 2 }
  ]);
  assert.deepEqual(buildTopProducts(null, products, 5), []);
});
