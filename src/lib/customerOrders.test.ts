import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCustomerOrderTotals,
  filterCustomerOrdersByDate,
  getCustomerOrderBalance,
  getCustomerOrderOutstanding,
  getCustomerOrderPaymentStatus,
  getTogoOrderDate,
  isOrderDate,
  normalizeCustomerOrderPaidAmount,
  normalizeCustomerOrderDebtHistory,
  normalizeCustomerOrderUnpaid,
  isCustomerOrderDebt,
  shouldShowCustomerOrderInDebtHistory
} from './customerOrders';

test('buildCustomerOrderTotals snapshots product data and calculates totals by boxes', () => {
  const result = buildCustomerOrderTotals([
    { product: { id: 'p1', name: '9126', spec: 12, price: 2500 }, boxes: 3 },
    { product: { id: 'p2', name: '6199', spec: 10, price: 1800 }, boxes: 2 }
  ]);

  assert.deepEqual(result.items, [
    {
      productId: 'p1',
      productName: '9126',
      spec: 12,
      unitPrice: 2500,
      boxes: 3,
      quantity: 36,
      subtotal: 90000
    },
    {
      productId: 'p2',
      productName: '6199',
      spec: 10,
      unitPrice: 1800,
      boxes: 2,
      quantity: 20,
      subtotal: 36000
    }
  ]);
  assert.equal(result.totalAmount, 126000);
});

test('buildCustomerOrderTotals rejects non-positive and fractional boxes', () => {
  const product = { id: 'p1', name: '9126', spec: 12, price: 2500 };
  assert.throws(() => buildCustomerOrderTotals([{ product, boxes: 0 }]), /箱数/);
  assert.throws(() => buildCustomerOrderTotals([{ product, boxes: 1.5 }]), /箱数/);
});

test('isOrderDate accepts real ISO dates only', () => {
  assert.equal(isOrderDate('2026-08-14'), true);
  assert.equal(isOrderDate('2026-02-30'), false);
  assert.equal(isOrderDate('14/08/2026'), false);
});

test('getTogoOrderDate returns the Africa/Lome business date', () => {
  assert.equal(getTogoOrderDate(new Date('2026-08-14T23:59:59Z')), '2026-08-14');
  assert.equal(getTogoOrderDate(new Date('2026-08-15T00:00:00Z')), '2026-08-15');
});

test('filterCustomerOrdersByDate keeps only orders from the selected date', () => {
  const orders = [
    { id: 'today-1', orderDate: '2026-08-14', totalAmount: 100 },
    { id: 'previous', orderDate: '2026-08-13', totalAmount: 200 },
    { id: 'today-2', orderDate: '2026-08-14', totalAmount: 300 },
  ];

  assert.deepEqual(filterCustomerOrdersByDate(orders, '2026-08-14').map((order) => order.id), ['today-1', 'today-2']);
  assert.equal(filterCustomerOrdersByDate(orders, '2026-08-12').length, 0);
});

test('normalizeCustomerOrderUnpaid treats existing orders without the field as paid', () => {
  assert.equal(normalizeCustomerOrderUnpaid(true), true);
  assert.equal(normalizeCustomerOrderUnpaid(false), false);
  assert.equal(normalizeCustomerOrderUnpaid(undefined), false);
});

test('normalizeCustomerOrderPaidAmount preserves old paid and unpaid order meaning', () => {
  assert.equal(normalizeCustomerOrderPaidAmount(undefined, false, 120000), 120000);
  assert.equal(normalizeCustomerOrderPaidAmount(undefined, true, 120000), 0);
  assert.equal(normalizeCustomerOrderPaidAmount(90000, false, 120000), 90000);
  assert.equal(normalizeCustomerOrderPaidAmount(135000, false, 120000), 135000);
});

test('customer order debt history keeps settled debts but excludes orders that were always paid', () => {
  assert.equal(normalizeCustomerOrderDebtHistory(undefined), false);
  assert.equal(normalizeCustomerOrderDebtHistory(true), true);
  assert.equal(shouldShowCustomerOrderInDebtHistory({ hasDebtHistory: false, isUnpaid: true, totalAmount: 120000, paidAmount: 0 }), true);
  assert.equal(shouldShowCustomerOrderInDebtHistory({ hasDebtHistory: false, isUnpaid: false, totalAmount: 120000, paidAmount: 90000 }), true);
  assert.equal(shouldShowCustomerOrderInDebtHistory({ hasDebtHistory: true, isUnpaid: false, totalAmount: 120000, paidAmount: 120000 }), true);
  assert.equal(shouldShowCustomerOrderInDebtHistory({ hasDebtHistory: false, isUnpaid: false, totalAmount: 120000, paidAmount: 120000 }), false);
});

test('customer order payment status distinguishes unpaid, short, overpaid and paid orders', () => {
  assert.equal(getCustomerOrderPaymentStatus({ isUnpaid: true, totalAmount: 120000, paidAmount: 0 }), 'unpaid');
  assert.equal(getCustomerOrderPaymentStatus({ isUnpaid: false, totalAmount: 120000, paidAmount: 90000 }), 'underpaid');
  assert.equal(getCustomerOrderPaymentStatus({ isUnpaid: false, totalAmount: 120000, paidAmount: 135000 }), 'overpaid');
  assert.equal(getCustomerOrderPaymentStatus({ isUnpaid: false, totalAmount: 120000, paidAmount: 120000 }), 'paid');
  assert.equal(getCustomerOrderBalance({ totalAmount: 120000, paidAmount: 90000 }), 30000);
  assert.equal(isCustomerOrderDebt({ isUnpaid: true, totalAmount: 120000, paidAmount: 0 }), true);
  assert.equal(isCustomerOrderDebt({ isUnpaid: false, totalAmount: 120000, paidAmount: 90000 }), true);
  assert.equal(isCustomerOrderDebt({ isUnpaid: false, totalAmount: 120000, paidAmount: 135000 }), false);
  assert.equal(getCustomerOrderOutstanding({ totalAmount: 120000, paidAmount: 90000 }), 30000);
  assert.equal(getCustomerOrderOutstanding({ totalAmount: 120000, paidAmount: 135000 }), 0);
});
