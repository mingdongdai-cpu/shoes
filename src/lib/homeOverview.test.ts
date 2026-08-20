import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCashCountDelta,
  calculateCashContributionAfterCountChange,
  calculateCurrentInventoryTotal,
  calculateCashCountTotal,
  calculateOutstandingDebtTotal
} from './homeOverview';

test('sums all cash count totals before the first remittance', () => {
  assert.equal(calculateCashCountTotal([
    { totalAmount: 2_644_800 },
    { totalAmount: 1_355_200 }
  ]), 4_000_000);
});

test('cash count changes update the current balance by their net difference', () => {
  assert.equal(applyCashCountDelta(300_000, 80_000, 125_000), 345_000);
  assert.equal(applyCashCountDelta(345_000, 125_000, 0), 220_000);
});

test('cash balance changes cannot produce a negative amount', () => {
  assert.throws(() => applyCashCountDelta(50_000, 80_000, 0), /现金余额变动无效/);
});

test('each remittance starts a new contribution cycle without changing cash history', () => {
  const firstCycleEdit = calculateCashContributionAfterCountChange(0, 100_000, 120_000);
  assert.equal(firstCycleEdit, 20_000);
  assert.equal(calculateCashContributionAfterCountChange(firstCycleEdit, 120_000, 150_000), 50_000);
  assert.equal(calculateCashContributionAfterCountChange(0, 150_000, 170_000), 20_000);
});

test('calculates current inventory from current stock and unit price', () => {
  assert.equal(calculateCurrentInventoryTotal([
    { stock: 72, price: 1_700 },
    { stock: 24, price: 2_200 }
  ]), 175_200);
});

test('combines only outstanding manual and customer-order debt', () => {
  assert.equal(calculateOutstandingDebtTotal(
    [
      { amount: 300_000, paidAmount: 100_000 },
      { amount: 50_000, paidAmount: 50_000 }
    ],
    [
      { totalAmount: 120_000, paidAmount: 20_000 },
      { totalAmount: 75_000, paidAmount: 90_000 }
    ]
  ), 300_000);
});
