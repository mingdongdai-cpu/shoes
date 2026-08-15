import type { CashDenomination, CashDenominationCounts, OrderDailyExpense } from '../types';

export const CASH_DENOMINATIONS: readonly CashDenomination[] = [10000, 5000, 2000, 1000, 500, 200, 100, 50];

export function createEmptyCashCounts(): CashDenominationCounts {
  return {
    '10000': 0,
    '5000': 0,
    '2000': 0,
    '1000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0
  };
}

export function normalizeCashCounts(value: unknown): CashDenominationCounts {
  const source = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const counts = createEmptyCashCounts();
  for (const denomination of CASH_DENOMINATIONS) {
    const key = String(denomination) as keyof CashDenominationCounts;
    const count = source[key];
    counts[key] = typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : 0;
  }
  return counts;
}

export function calculateCashTotal(counts: CashDenominationCounts): number {
  return CASH_DENOMINATIONS.reduce((total, denomination) => (
    total + denomination * counts[String(denomination) as keyof CashDenominationCounts]
  ), 0);
}

export function calculateAccountingDifference(
  customerOrderTotal: number,
  cashTotal: number,
  expenseTotal: number,
  customerDebtTotal: number
): number {
  return customerOrderTotal - cashTotal - expenseTotal - customerDebtTotal;
}

export function filterOrderExpensesByDate(expenses: readonly OrderDailyExpense[], selectedDate: string): OrderDailyExpense[] {
  return expenses.filter((expense) => expense.expenseDate === selectedDate);
}
