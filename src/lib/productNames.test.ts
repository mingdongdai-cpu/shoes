import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findUniqueProductByName,
  hasDuplicateProductName,
  normalizeProductName
} from './productNames';

const products = [
  { id: 'first', name: 'ABC' },
  { id: 'second', name: 'Runner' }
];

test('normalizeProductName trims whitespace and ignores case', () => {
  assert.equal(normalizeProductName('  AbC  '), normalizeProductName('abc'));
});

test('hasDuplicateProductName applies the same rule when adding and editing', () => {
  assert.equal(hasDuplicateProductName(products, ' abc '), true);
  assert.equal(hasDuplicateProductName(products, 'abc', 'first'), false);
});

test('findUniqueProductByName refuses ambiguous names', () => {
  const duplicatedProducts = [...products, { id: 'third', name: ' abc ' }];
  assert.equal(findUniqueProductByName(products, ' abc ')?.id, 'first');
  assert.equal(findUniqueProductByName(duplicatedProducts, 'abc'), undefined);
});
