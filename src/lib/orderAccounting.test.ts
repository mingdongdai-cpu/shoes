import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase/firestore';
import { calculateAccountingDifference, calculateCashTotal, createEmptyCashCounts, filterOrderExpensesByDate, normalizeCashCounts } from './orderAccounting';

test('cash total multiplies every denomination by its note count', () => {
  const counts = createEmptyCashCounts();
  counts['10000'] = 2;
  counts['5000'] = 3;
  counts['500'] = 4;
  counts['100'] = 5;
  counts['50'] = 3;
  assert.equal(calculateCashTotal(counts), 37650);
});

test('cash counts normalize invalid and missing values to zero', () => {
  assert.deepEqual(normalizeCashCounts({ '10000': 2, '5000': -1, '1000': 1.5, '100': 4, '50': 6 }), {
    '10000': 2,
    '5000': 0,
    '2000': 0,
    '1000': 0,
    '500': 0,
    '200': 0,
    '100': 4,
    '50': 6
  });
});

test('daily expenses are filtered by the selected business date', () => {
  const timestamp = Timestamp.fromMillis(0);
  const expenses = [
    { id: 'today', expenseDate: '2026-08-14', amount: 1000, remark: 'Transport', operatorUid: 'u', createdAt: timestamp, updatedAt: timestamp },
    { id: 'past', expenseDate: '2026-08-13', amount: 2000, remark: 'Repas', operatorUid: 'u', createdAt: timestamp, updatedAt: timestamp }
  ];
  assert.deepEqual(filterOrderExpensesByDate(expenses, '2026-08-14').map((expense) => expense.id), ['today']);
});

test('accounting difference subtracts cash, expenses and debt, then adds debts settled that day', () => {
  assert.equal(calculateAccountingDifference(500000, 350000, 50000, 100000, 0), 0);
  assert.equal(calculateAccountingDifference(500000, 420000, 50000, 100000, 70000), 0);
  assert.equal(calculateAccountingDifference(500000, 390000, 50000, 100000, 70000), 30000);
  assert.equal(calculateAccountingDifference(500000, 440000, 50000, 100000, 70000), -20000);
});
