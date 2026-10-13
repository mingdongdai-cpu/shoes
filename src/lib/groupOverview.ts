export interface CountryMonthSummary {
  outAmount: number;
  expenseAmount: number;
  outByProduct: Record<string, { quantity: number; amount: number }>;
}

export interface CountryProductInfo {
  name: string;
  spec: number;
}

export interface ProductSalesRow {
  productId: string;
  name: string;
  amount: number;
  boxes: number;
}

export interface SalesSummary {
  amount: number;
  boxes: number;
  rows: ProductSalesRow[];
}

export interface SaleTransaction {
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  unitPrice: number;
  occurredAt: Date;
}

export interface CargoSummary {
  inTransitCount: number;
  inTransitBoxes: number;
  arrivedCount: number;
  arrivedBoxes: number;
}

export function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map((value) => Number.parseInt(value, 10));
  const previous = new Date(year, month - 2, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
}

export function calculateChangePercent(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

const toBoxes = (quantity: number, product: CountryProductInfo | undefined) =>
  quantity / (product && product.spec > 0 ? product.spec : 1);

const sortRows = (rows: ProductSalesRow[]) =>
  rows.sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name));

export function summarizeMonthSales(
  month: CountryMonthSummary | null,
  products: ReadonlyMap<string, CountryProductInfo>
): SalesSummary {
  const rows = Object.entries(month?.outByProduct ?? {})
    .filter(([, aggregate]) => aggregate.quantity > 0 || aggregate.amount > 0)
    .map(([productId, aggregate]) => ({
      productId,
      name: products.get(productId)?.name ?? '未知商品',
      amount: aggregate.amount,
      boxes: toBoxes(aggregate.quantity, products.get(productId))
    }));
  return {
    amount: month?.outAmount ?? 0,
    boxes: rows.reduce((total, row) => total + row.boxes, 0),
    rows: sortRows(rows)
  };
}

export function summarizeTransactionSales(
  transactions: readonly SaleTransaction[],
  products: ReadonlyMap<string, CountryProductInfo>
): SalesSummary {
  const byProduct = new Map<string, { quantity: number; amount: number }>();
  for (const transaction of transactions) {
    if (transaction.type !== 'out') continue;
    const current = byProduct.get(transaction.productId) ?? { quantity: 0, amount: 0 };
    current.quantity += transaction.quantity;
    current.amount += transaction.quantity * transaction.unitPrice;
    byProduct.set(transaction.productId, current);
  }
  const rows = [...byProduct.entries()].map(([productId, aggregate]) => ({
    productId,
    name: products.get(productId)?.name ?? '未知商品',
    amount: aggregate.amount,
    boxes: toBoxes(aggregate.quantity, products.get(productId))
  }));
  return {
    amount: rows.reduce((total, row) => total + row.amount, 0),
    boxes: rows.reduce((total, row) => total + row.boxes, 0),
    rows: sortRows(rows)
  };
}

export function buildDailySales(transactions: readonly SaleTransaction[], monthKey: string): number[] {
  const [year, month] = monthKey.split('-').map((value) => Number.parseInt(value, 10));
  const daily = Array<number>(new Date(year, month, 0).getDate()).fill(0);
  for (const transaction of transactions) {
    const date = transaction.occurredAt;
    if (transaction.type !== 'out' || date.getFullYear() !== year || date.getMonth() !== month - 1) continue;
    daily[date.getDate() - 1] += transaction.quantity * transaction.unitPrice;
  }
  return daily;
}

export function summarizeCargo(containers: readonly { status: string; cargoBoxes: number }[]): CargoSummary {
  const summary: CargoSummary = { inTransitCount: 0, inTransitBoxes: 0, arrivedCount: 0, arrivedBoxes: 0 };
  for (const container of containers) {
    if (container.status === '在途') {
      summary.inTransitCount += 1;
      summary.inTransitBoxes += container.cargoBoxes;
    } else if (container.status === '到港') {
      summary.arrivedCount += 1;
      summary.arrivedBoxes += container.cargoBoxes;
    }
  }
  return summary;
}
