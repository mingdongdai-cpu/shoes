import assert from 'node:assert/strict';
import test from 'node:test';
import { getPreviousMonthToDateRange, toIsoWeekInputValue, toLocalDateInputValue } from './timeWindow';

test('toLocalDateInputValue uses the device calendar date', () => {
  assert.equal(toLocalDateInputValue(new Date(2026, 9, 12, 0, 0, 0)), '2026-10-12');
  assert.equal(toLocalDateInputValue(new Date(2026, 9, 12, 23, 59, 59)), '2026-10-12');
});

test('toIsoWeekInputValue uses the device calendar date', () => {
  assert.equal(toIsoWeekInputValue(new Date(2026, 9, 11, 23, 59, 59)), '2026-W41');
  assert.equal(toIsoWeekInputValue(new Date(2026, 9, 12, 0, 0, 0)), '2026-W42');
});

test('getPreviousMonthToDateRange covers the same days of the previous month', () => {
  const range = getPreviousMonthToDateRange(new Date(2026, 9, 12, 9, 30));
  assert.equal(range.start.getTime(), new Date(2026, 8, 1, 0, 0, 0, 0).getTime());
  assert.equal(range.end.getTime(), new Date(2026, 8, 12, 23, 59, 59, 999).getTime());
});

test('getPreviousMonthToDateRange stops at the end of a shorter previous month', () => {
  const range = getPreviousMonthToDateRange(new Date(2026, 2, 31, 18, 0));
  assert.equal(range.start.getTime(), new Date(2026, 1, 1).getTime());
  assert.equal(range.end.getTime(), new Date(2026, 1, 28, 23, 59, 59, 999).getTime());
});

test('getPreviousMonthToDateRange crosses into the previous year in January', () => {
  const range = getPreviousMonthToDateRange(new Date(2027, 0, 15, 8, 0));
  assert.equal(range.start.getTime(), new Date(2026, 11, 1).getTime());
  assert.equal(range.end.getTime(), new Date(2026, 11, 15, 23, 59, 59, 999).getTime());
});
