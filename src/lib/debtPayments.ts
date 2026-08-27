import type { DebtSource } from '../types';

export function getDebtPaymentKey(debtSource: DebtSource, debtId: string): string {
  return `${debtSource}:${debtId}`;
}

export function calculatePaidAmountAfterPaymentChange(
  totalAmount: number,
  currentPaidAmount: number,
  previousPaymentAmount: number,
  nextPaymentAmount: number
): number {
  const values = [totalAmount, currentPaidAmount, previousPaymentAmount, nextPaymentAmount];
  if (!values.every((value) => Number.isInteger(value)) || totalAmount <= 0 || currentPaidAmount < 0 || previousPaymentAmount < 0 || nextPaymentAmount < 0) {
    throw new Error('回款金额无效');
  }
  const nextPaidAmount = currentPaidAmount - previousPaymentAmount + nextPaymentAmount;
  if (nextPaidAmount < 0 || nextPaidAmount > totalAmount) {
    throw new Error('回款金额不能超过剩余欠款');
  }
  return nextPaidAmount;
}
