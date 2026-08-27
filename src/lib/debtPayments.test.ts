import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePaidAmountAfterPaymentChange, getDebtPaymentKey } from './debtPayments';

test('records a partial payment by adding only the current receipt', () => {
  assert.equal(calculatePaidAmountAfterPaymentChange(733_200, 730_000, 0, 3_200), 733_200);
  assert.equal(calculatePaidAmountAfterPaymentChange(100_000, 20_000, 0, 15_000), 35_000);
});

test('editing and deleting a payment adjust only that payment delta', () => {
  assert.equal(calculatePaidAmountAfterPaymentChange(100_000, 35_000, 15_000, 12_000), 32_000);
  assert.equal(calculatePaidAmountAfterPaymentChange(100_000, 32_000, 12_000, 0), 20_000);
});

test('rejects a receipt that would exceed the remaining balance', () => {
  assert.throws(() => calculatePaidAmountAfterPaymentChange(100_000, 95_000, 0, 6_000), /不能超过剩余欠款/);
});

test('uses a stable payment key for manual debts and customer orders', () => {
  assert.equal(getDebtPaymentKey('manual', 'debt-1'), 'manual:debt-1');
  assert.equal(getDebtPaymentKey('customer-order', 'order-1'), 'customer-order:order-1');
});
