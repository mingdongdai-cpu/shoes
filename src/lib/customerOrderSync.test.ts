import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase/firestore';
import type { CustomerOrder } from '../types';
import { aggregateCustomerOrdersForInventory } from './customerOrderSync';

const baseOrder: CustomerOrder = {
  id: 'o1', customerName: 'Client A', orderDate: '2026-08-14', isUnpaid: false,
  paidAmount: 0, hasDebtHistory: false, items: [], totalAmount: 0,
  operatorUid: 'order-user', createdAt: Timestamp.fromMillis(0)
};

test('customer orders aggregate the same product and preserve the exact amount', () => {
  const lines = aggregateCustomerOrdersForInventory([
    { ...baseOrder, items: [{ productId: 'p1', productName: 'A', spec: 24, unitPrice: 100, boxes: 2, quantity: 48, subtotal: 4_800 }] },
    { ...baseOrder, id: 'o2', items: [{ productId: 'p1', productName: 'A', spec: 24, unitPrice: 120, boxes: 1, quantity: 24, subtotal: 2_880 }] }
  ]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, 72);
  assert.equal(lines[0].amount, 7_680);
  assert.equal(lines[0].unitPrice * lines[0].quantity, 7_680);
});

test('customer order inventory aggregation rejects invalid quantities', () => {
  assert.throws(() => aggregateCustomerOrdersForInventory([
    { ...baseOrder, items: [{ productId: 'p1', productName: 'A', spec: 24, unitPrice: 100, boxes: 0, quantity: 0, subtotal: 0 }] }
  ]), /无效商品明细/);
});
