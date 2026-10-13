import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailySales,
  calculateChangePercent,
  getPreviousMonthKey,
  summarizeCargo,
  summarizeMonthSales,
  summarizeTransactionSales
} from './groupOverview';

const products = new Map([
  ['a', { name: 'AJ1', spec: 12 }],
  ['b', { name: 'NB550', spec: 10 }]
]);

test('getPreviousMonthKey steps back one month across years', () => {
  assert.equal(getPreviousMonthKey('2026-10'), '2026-09');
  assert.equal(getPreviousMonthKey('2027-01'), '2026-12');
});

test('calculateChangePercent returns null without a previous value', () => {
  assert.equal(calculateChangePercent(120, 100), 20);
  assert.equal(calculateChangePercent(50, 0), null);
});

test('summarizeMonthSales ranks products by amount and converts to boxes', () => {
  const summary = summarizeMonthSales({
    outAmount: 140000,
    expenseAmount: 0,
    outByProduct: { a: { quantity: 24, amount: 50000 }, b: { quantity: 15, amount: 90000 }, z: { quantity: 0, amount: 0 } }
  }, products);
  assert.equal(summary.amount, 140000);
  assert.equal(summary.boxes, 3.5);
  assert.deepEqual(summary.rows.map((row) => [row.name, row.boxes]), [['NB550', 1.5], ['AJ1', 2]]);
  assert.deepEqual(summarizeMonthSales(null, products), { amount: 0, boxes: 0, rows: [] });
});

test('summarizeTransactionSales only counts outbound transactions', () => {
  const at = new Date(2026, 9, 12, 10);
  const summary = summarizeTransactionSales([
    { productId: 'a', type: 'out', quantity: 12, unitPrice: 2000, occurredAt: at },
    { productId: 'a', type: 'out', quantity: 6, unitPrice: 2000, occurredAt: at },
    { productId: 'b', type: 'in', quantity: 100, unitPrice: 1000, occurredAt: at }
  ], products);
  assert.deepEqual(summary, { amount: 36000, boxes: 1.5, rows: [{ productId: 'a', name: 'AJ1', amount: 36000, boxes: 1.5 }] });
});

test('buildDailySales fills every day of the month by local date', () => {
  const daily = buildDailySales([
    { productId: 'a', type: 'out', quantity: 2, unitPrice: 100, occurredAt: new Date(2026, 1, 1, 0, 5) },
    { productId: 'a', type: 'out', quantity: 1, unitPrice: 100, occurredAt: new Date(2026, 1, 28, 23, 55) },
    { productId: 'a', type: 'out', quantity: 9, unitPrice: 100, occurredAt: new Date(2026, 2, 1, 0, 0) }
  ], '2026-02');
  assert.equal(daily.length, 28);
  assert.equal(daily[0], 200);
  assert.equal(daily[27], 100);
});

test('summarizeCargo counts containers in transit and at port', () => {
  assert.deepEqual(summarizeCargo([
    { status: '在途', cargoBoxes: 1000 },
    { status: '在途', cargoBoxes: 500 },
    { status: '到港', cargoBoxes: 800 },
    { status: '到库', cargoBoxes: 900 }
  ]), { inTransitCount: 2, inTransitBoxes: 1500, arrivedCount: 1, arrivedBoxes: 800 });
});
