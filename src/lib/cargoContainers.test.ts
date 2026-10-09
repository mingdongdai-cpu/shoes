import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase/firestore';
import { areCargoContainerDatesValid, buildCargoContainerItems, compareCargoContainers, getCargoContainerCardDate, getCargoContainerTotalBoxes, resolveCargoContainerBoxes } from './cargoContainers';
import { CARGO_CONTAINER_STATUSES, type CargoContainer } from '../types';

test('cargo container status options are the three canonical workflow states', () => {
  assert.deepEqual(CARGO_CONTAINER_STATUSES, ['在途', '到港', '到库']);
});

test('cargo containers group by status, with undated transit first then arrival date', () => {
  const container = (
    id: string,
    status: CargoContainer['status'],
    arrivalDate: string | null,
    createdAt: number
  ) => ({ id, status, arrivalDate, createdAt: Timestamp.fromMillis(createdAt) });

  const containers = [
    container('stocked', '到库', '2026-10-01', 900),
    container('arrived-old', '到港', '2026-10-03', 100),
    container('transit-later', '在途', '2026-11-05', 800),
    container('transit-undated-old', '在途', null, 200),
    container('arrived-new', '到港', '2026-10-04', 700),
    container('transit-earlier', '在途', '2026-10-14', 300),
    container('transit-undated-new', '在途', null, 600)
  ];

  assert.deepEqual(containers.sort(compareCargoContainers).map(({ id }) => id), [
    'transit-undated-new',
    'transit-undated-old',
    'transit-earlier',
    'transit-later',
    'arrived-new',
    'arrived-old',
    'stocked'
  ]);
});

test('only stocked containers require a valid stock date without replacing the arrival date', () => {
  assert.equal(areCargoContainerDatesValid('在途', null, null), true);
  assert.equal(areCargoContainerDatesValid('到港', '2026-10-14', null), true);
  assert.equal(areCargoContainerDatesValid('到库', '2026-10-14', '2026-10-20'), true);
  assert.equal(areCargoContainerDatesValid('到库', null, '2026-10-20'), true);
  assert.equal(areCargoContainerDatesValid('到库', '2026-10-14', null), false);
  assert.equal(areCargoContainerDatesValid('到库', null, '2026-02-31'), false);
  assert.equal(areCargoContainerDatesValid('在途', null, '2026-10-20'), false);
});

test('a stocked container can return to arrived and show its original estimated date', () => {
  const container = { status: '到库' as const, arrivalDate: '2026-10-14', stockedDate: '2026-10-20' };
  assert.deepEqual(getCargoContainerCardDate(container), { label: '到库日期', value: '2026-10-20' });
  const corrected = { ...container, status: '到港' as const, stockedDate: null };
  assert.equal(areCargoContainerDatesValid(corrected.status, corrected.arrivalDate, corrected.stockedDate), true);
  assert.deepEqual(getCargoContainerCardDate(corrected), { label: '预计到港日期', value: '2026-10-14' });
});

test('buildCargoContainerItems snapshots product quantities by carton', () => {
  const items = buildCargoContainerItems([
    { product: { id: 'p1', name: '9126', spec: 24 }, boxes: 12 },
    { product: { id: 'p2', name: '6199', spec: 36 }, boxes: 5 }
  ]);

  assert.deepEqual(items, [
    { productId: 'p1', productName: '9126', spec: 24, boxes: 12, quantity: 288 },
    { productId: 'p2', productName: '6199', spec: 36, boxes: 5, quantity: 180 }
  ]);
  assert.equal(getCargoContainerTotalBoxes(items), 17);
});

test('buildCargoContainerItems rejects invalid boxes and duplicate products', () => {
  const product = { id: 'p1', name: '9126', spec: 24 };
  assert.throws(() => buildCargoContainerItems([{ product, boxes: 0 }]), /箱数/);
  assert.throws(() => buildCargoContainerItems([
    { product, boxes: 1 },
    { product, boxes: 2 }
  ]), /不能重复/);
});

test('resolveCargoContainerBoxes uses product lines when present and source total otherwise', () => {
  const items = buildCargoContainerItems([{ product: { id: 'p1', name: '9126', spec: 24 }, boxes: 12 }]);
  assert.equal(resolveCargoContainerBoxes(items, 999), 12);
  assert.equal(resolveCargoContainerBoxes([], 956), 956);
  assert.throws(() => resolveCargoContainerBoxes([], 0), /货物总箱数/);
});
