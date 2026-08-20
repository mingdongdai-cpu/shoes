export function calculateCashCountTotal(records: readonly { totalAmount: number }[]): number {
  return records.reduce((total, record) => total + record.totalAmount, 0);
}

export function applyCashCountDelta(currentBalance: number, previousTotal: number, nextTotal: number): number {
  const nextBalance = currentBalance + nextTotal - previousTotal;
  if (![currentBalance, previousTotal, nextTotal].every(Number.isInteger) || nextBalance < 0) {
    throw new Error('现金余额变动无效');
  }
  return nextBalance;
}

export function calculateCashContributionAfterCountChange(
  previousContribution: number,
  previousTotal: number,
  nextTotal: number
): number {
  if (![previousContribution, previousTotal, nextTotal].every(Number.isInteger)) {
    throw new Error('现金盘点贡献变动无效');
  }
  return previousContribution + nextTotal - previousTotal;
}

export function calculateCurrentInventoryTotal(products: readonly { stock: number; price: number }[]): number {
  return products.reduce((total, product) => total + product.stock * product.price, 0);
}

export function calculateOutstandingDebtTotal(
  manualDebts: readonly { amount: number; paidAmount: number }[],
  customerOrders: readonly { totalAmount: number; paidAmount: number }[]
): number {
  const manualTotal = manualDebts.reduce(
    (total, debt) => total + Math.max(0, debt.amount - debt.paidAmount),
    0
  );
  const customerOrderTotal = customerOrders.reduce(
    (total, order) => total + Math.max(0, order.totalAmount - order.paidAmount),
    0
  );
  return manualTotal + customerOrderTotal;
}
