import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateProductRisk, type ProductRiskInput } from './productRisk';

const now = new Date(2026, 9, 12, 15, 0, 0);
const daysAgo = (days: number) => new Date(2026, 9, 12 - days, 10, 0, 0);
const spec = 10;
const boxes = (count: number) => count * spec;

const risk = (overrides: Partial<ProductRiskInput>) => calculateProductRisk({
  productId: 'p1',
  spec,
  stock: boxes(100),
  createdAt: daysAgo(365),
  lastSaleAt: daysAgo(1),
  outQuantity30d: boxes(30),
  ...overrides
}, now);

test('selling product with less than 60 days of cover is a warning, not stale', () => {
  const metrics = risk({ stock: boxes(59), outQuantity30d: boxes(30) });
  assert.equal(metrics.isWarning, true);
  assert.deepEqual(metrics.warningReasons, ['可售不足60天']);
  assert.equal(metrics.isStale, false);
});

test('60 days of cover or more is not a warning, even below 30 boxes', () => {
  assert.equal(risk({ stock: boxes(60), outQuantity30d: boxes(30) }).isWarning, false);
  assert.equal(risk({ stock: boxes(20), outQuantity30d: boxes(1) }).isWarning, false);
});

test('low stock without recent sales is not a warning', () => {
  const metrics = risk({ stock: boxes(5), outQuantity30d: 0, lastSaleAt: daysAgo(200) });
  assert.equal(metrics.isWarning, false);
  assert.equal(metrics.isStale, true);
});

test('below one box and sold within 90 days is out of stock', () => {
  const metrics = risk({ stock: 0, outQuantity30d: 0, lastSaleAt: daysAgo(90) });
  assert.equal(metrics.isOutOfStock, true);
  assert.deepEqual(metrics.warningReasons, ['已断货']);
  assert.equal(metrics.isStale, false);
});

test('below one box with last sale over 90 days ago is neither warning nor stale', () => {
  const metrics = risk({ stock: spec - 1, outQuantity30d: 0, lastSaleAt: daysAgo(91) });
  assert.equal(metrics.isWarning, false);
  assert.equal(metrics.isStale, false);
});

test('more than 180 days of cover is stale as slow-moving', () => {
  const metrics = risk({ stock: boxes(181), outQuantity30d: boxes(30) });
  assert.equal(metrics.isStale, true);
  assert.deepEqual(metrics.staleReasons, ['可售超过180天']);
  assert.equal(risk({ stock: boxes(180), outQuantity30d: boxes(30) }).isStale, false);
});

test('no sales in 30 days is stale', () => {
  const metrics = risk({ stock: boxes(1), outQuantity30d: 0, lastSaleAt: daysAgo(30) });
  assert.equal(metrics.isStale, true);
  assert.deepEqual(metrics.staleReasons, ['30天无销售']);
});

test('products created within 30 days are not stale yet', () => {
  assert.equal(risk({ outQuantity30d: 0, lastSaleAt: null, createdAt: daysAgo(29) }).isStale, false);
  const metrics = risk({ outQuantity30d: 0, lastSaleAt: null, createdAt: daysAgo(30) });
  assert.equal(metrics.isStale, true);
  assert.deepEqual(metrics.staleReasons, ['从未销售']);
});
