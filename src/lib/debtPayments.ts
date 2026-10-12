import { Timestamp, type DocumentData } from 'firebase/firestore';
import type { DebtPayment, DebtSource } from '../types';

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

export function mapDebtPaymentDoc(id: string, data: DocumentData): DebtPayment {
  if (!(data.createdAt instanceof Timestamp)) {
    throw new Error('debtPayments.createdAt 必须是 Firestore Timestamp');
  }
  const createdAt = data.createdAt;
  return {
    id,
    debtSource: data.debtSource === 'manual' ? 'manual' : 'customer-order',
    debtId: String(data.debtId ?? ''),
    debtKey: String(data.debtKey ?? ''),
    amount: Number(data.amount ?? 0),
    paymentDate: String(data.paymentDate ?? ''),
    operatorUid: String(data.operatorUid ?? ''),
    createdAt,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : createdAt
  };
}
