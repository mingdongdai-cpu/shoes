import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAnalyticsDelta } from './analytics';

const at = new Date('2026-08-14T10:00:00.000Z');

test('transaction create and delete produce inverse aggregate deltas', () => {
  const item = { productId: 'p1', type: 'out' as const, quantity: 24, unitPrice: 2000, occurredAt: at };
  const created = buildAnalyticsDelta({ afterTransactions: [item] });
  const deleted = buildAnalyticsDelta({ beforeTransactions: [item] });
  assert.equal(created.overview.outTotal, 48_000);
  assert.equal(created.overview.transactionCount, 1);
  assert.deepEqual(deleted.overview, {
    inTotal: 0,
    outTotal: -48_000,
    balance: 48_000,
    transactionCount: -1,
    expenseCount: 0
  });
  assert.equal(created.months['2026-08'].outByProduct.p1.quantity, 24);
  assert.equal(deleted.months['2026-08'].outByProduct.p1.quantity, -24);
});

test('transaction edit moves totals between months and products', () => {
  const delta = buildAnalyticsDelta({
    beforeTransactions: [{ productId: 'old', type: 'out', quantity: 10, unitPrice: 100, occurredAt: new Date('2026-07-31T10:00:00Z') }],
    afterTransactions: [{ productId: 'new', type: 'out', quantity: 20, unitPrice: 200, occurredAt: at }]
  });
  assert.equal(delta.overview.outTotal, 3_000);
  assert.equal(delta.overview.transactionCount, 0);
  assert.equal(delta.months['2026-07'].outAmount, -1_000);
  assert.equal(delta.months['2026-08'].outAmount, 4_000);
});

test('expense create updates only expense count and monthly expense total', () => {
  const delta = buildAnalyticsDelta({ afterExpenses: [{ amount: 12_500, occurredAt: at }] });
  assert.equal(delta.overview.expenseCount, 1);
  assert.equal(delta.overview.balance, 0);
  assert.equal(delta.months['2026-08'].expenseAmount, 12_500);
});
