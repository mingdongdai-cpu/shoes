export const IN_TOTAL_BASELINE_VALUE = 193_154_500;
export const IN_TOTAL_BASELINE_MS = Date.UTC(2026, 3, 23);

export interface AnalyticsTransactionInput {
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  unitPrice: number;
  occurredAt: Date;
}

export interface AnalyticsExpenseInput {
  amount: number;
  occurredAt: Date;
}

export interface MonthAnalyticsDelta {
  inAmount: number;
  outAmount: number;
  expenseAmount: number;
  outByProduct: Record<string, { quantity: number; amount: number }>;
}

export interface AnalyticsDelta {
  overview: {
    inTotal: number;
    outTotal: number;
    balance: number;
    transactionCount: number;
    expenseCount: number;
  };
  months: Record<string, MonthAnalyticsDelta>;
}

export function getAnalyticsMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function emptyMonthDelta(): MonthAnalyticsDelta {
  return { inAmount: 0, outAmount: 0, expenseAmount: 0, outByProduct: {} };
}

export function buildAnalyticsDelta({
  beforeTransactions = [],
  afterTransactions = [],
  beforeExpenses = [],
  afterExpenses = []
}: {
  beforeTransactions?: AnalyticsTransactionInput[];
  afterTransactions?: AnalyticsTransactionInput[];
  beforeExpenses?: AnalyticsExpenseInput[];
  afterExpenses?: AnalyticsExpenseInput[];
}): AnalyticsDelta {
  const result: AnalyticsDelta = {
    overview: { inTotal: 0, outTotal: 0, balance: 0, transactionCount: 0, expenseCount: 0 },
    months: {}
  };

  const applyTransaction = (item: AnalyticsTransactionInput, sign: 1 | -1) => {
    const amount = item.quantity * item.unitPrice * sign;
    const month = result.months[getAnalyticsMonthKey(item.occurredAt)] ?? emptyMonthDelta();
    if (item.type === 'in') {
      month.inAmount += amount;
      if (item.occurredAt.getTime() >= IN_TOTAL_BASELINE_MS) result.overview.inTotal += amount;
    } else {
      month.outAmount += amount;
      result.overview.outTotal += amount;
      const product = month.outByProduct[item.productId] ?? { quantity: 0, amount: 0 };
      product.quantity += item.quantity * sign;
      product.amount += amount;
      month.outByProduct[item.productId] = product;
    }
    result.months[getAnalyticsMonthKey(item.occurredAt)] = month;
  };

  beforeTransactions.forEach((item) => applyTransaction(item, -1));
  afterTransactions.forEach((item) => applyTransaction(item, 1));
  result.overview.transactionCount = afterTransactions.length - beforeTransactions.length;

  const applyExpense = (item: AnalyticsExpenseInput, sign: 1 | -1) => {
    const monthKey = getAnalyticsMonthKey(item.occurredAt);
    const month = result.months[monthKey] ?? emptyMonthDelta();
    month.expenseAmount += item.amount * sign;
    result.months[monthKey] = month;
  };
  beforeExpenses.forEach((item) => applyExpense(item, -1));
  afterExpenses.forEach((item) => applyExpense(item, 1));
  result.overview.expenseCount = afterExpenses.length - beforeExpenses.length;
  result.overview.balance = result.overview.inTotal - result.overview.outTotal;
  return result;
}
