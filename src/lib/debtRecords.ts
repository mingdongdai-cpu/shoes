export interface DebtSortValues {
  amount: number;
  paidAmount: number;
  debtMillis: number;
  settledMillis: number | null;
}

export function isDebtSettled(record: Pick<DebtSortValues, 'amount' | 'paidAmount'>): boolean {
  return record.paidAmount >= record.amount;
}

export function compareDebtRecords(left: DebtSortValues, right: DebtSortValues): number {
  const leftSettled = isDebtSettled(left);
  const rightSettled = isDebtSettled(right);

  if (leftSettled !== rightSettled) return leftSettled ? 1 : -1;
  if (!leftSettled) return right.debtMillis - left.debtMillis;

  const settledDifference = (right.settledMillis ?? Number.NEGATIVE_INFINITY) -
    (left.settledMillis ?? Number.NEGATIVE_INFINITY);
  return settledDifference || right.debtMillis - left.debtMillis;
}

export function resolveSettlementValue<T>(
  existingValue: T | null | undefined,
  wasSettled: boolean,
  isSettled: boolean,
  currentValue: T
): T | null {
  if (!isSettled) return null;
  if (wasSettled) return existingValue ?? null;
  return currentValue;
}
