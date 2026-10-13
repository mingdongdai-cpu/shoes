export interface CountryMonthSummary {
  outAmount: number;
  expenseAmount: number;
  outByProduct: Record<string, { quantity: number; amount: number }>;
}

export interface CountryProductInfo {
  name: string;
  spec: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  amount: number;
  boxes: number;
}

export function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map((value) => Number.parseInt(value, 10));
  const previous = new Date(year, month - 2, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
}

export function calculateSalesMoM(currentSales: number, previousSales: number): number | null {
  return previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : null;
}

export function buildTopProducts(
  month: CountryMonthSummary | null,
  products: ReadonlyMap<string, CountryProductInfo>,
  limit: number
): TopProduct[] {
  if (!month) return [];
  return Object.entries(month.outByProduct)
    .filter(([, aggregate]) => aggregate.amount > 0)
    .map(([productId, aggregate]) => {
      const product = products.get(productId);
      return {
        productId,
        name: product?.name ?? '未知商品',
        amount: aggregate.amount,
        boxes: aggregate.quantity / (product && product.spec > 0 ? product.spec : 1)
      };
    })
    .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name))
    .slice(0, limit);
}
