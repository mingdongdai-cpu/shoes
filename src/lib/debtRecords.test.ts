import assert from 'node:assert/strict';
import test from 'node:test';
import { compareDebtRecords, resolveSettlementValue } from './debtRecords';

test('debt records keep unpaid first and sort each status by its required date', () => {
  const rows = [
    { id: 'settled-older', amount: 100, paidAmount: 100, debtMillis: 500, settledMillis: 800 },
    { id: 'unpaid-older', amount: 100, paidAmount: 20, debtMillis: 600, settledMillis: null },
    { id: 'settled-newer', amount: 100, paidAmount: 100, debtMillis: 100, settledMillis: 900 },
    { id: 'unpaid-newer', amount: 100, paidAmount: 0, debtMillis: 700, settledMillis: null },
    { id: 'settled-unknown', amount: 100, paidAmount: 100, debtMillis: 1000, settledMillis: null }
  ];

  assert.deepEqual(rows.sort(compareDebtRecords).map((row) => row.id), [
    'unpaid-newer',
    'unpaid-older',
    'settled-newer',
    'settled-older',
    'settled-unknown'
  ]);
});

test('settlement date is created on settlement, preserved while settled and cleared when reopened', () => {
  assert.equal(resolveSettlementValue(undefined, false, true, 'now'), 'now');
  assert.equal(resolveSettlementValue('original', true, true, 'now'), 'original');
  assert.equal(resolveSettlementValue(undefined, true, true, 'now'), null);
  assert.equal(resolveSettlementValue('original', true, false, 'now'), null);
});
