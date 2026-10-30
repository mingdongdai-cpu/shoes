import type { ProductRiskMetrics } from '../types';

export const SALES_LOOKBACK_DAYS = 30;
export const WARNING_COVER_DAYS = 60;
export const OUT_OF_STOCK_RECENT_SALE_DAYS = 90;
export const STALE_COVER_DAYS = 180;
export const NEW_PRODUCT_GRACE_DAYS = 30;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface ProductRiskInput {
  productId: string;
  spec: number;
  stock: number;
  createdAt: Date | null;
  lastSaleAt: Date | null;
  outQuantity30d: number;
}

function calendarDaysBetween(from: Date, to: Date): number {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.max(0, Math.round((toDay.getTime() - fromDay.getTime()) / MS_PER_DAY));
}

export function calculateProductRisk(input: ProductRiskInput, now: Date): ProductRiskMetrics {
  const spec = input.spec > 0 ? input.spec : 1;
  const stockBoxes = input.stock / spec;
  const avgDailyBoxes30d = input.outQuantity30d / spec / SALES_LOOKBACK_DAYS;
  const daysOfCover = avgDailyBoxes30d > 0 ? stockBoxes / avgDailyBoxes30d : Number.POSITIVE_INFINITY;
  const daysSinceLastSale = input.lastSaleAt ? calendarDaysBetween(input.lastSaleAt, now) : null;
  const productAgeDays = input.createdAt ? calendarDaysBetween(input.createdAt, now) : Number.POSITIVE_INFINITY;

  const isOutOfStock = stockBoxes < 1 && daysSinceLastSale !== null && daysSinceLastSale <= OUT_OF_STOCK_RECENT_SALE_DAYS;
  const warningReasons = isOutOfStock
    ? ['已断货']
    : avgDailyBoxes30d > 0 && daysOfCover < WARNING_COVER_DAYS
      ? [`可售不足${WARNING_COVER_DAYS}天`]
      : [];

  const isStale = stockBoxes >= 1 && productAgeDays >= NEW_PRODUCT_GRACE_DAYS && daysOfCover > STALE_COVER_DAYS;
  const staleReasons = !isStale
    ? []
    : avgDailyBoxes30d > 0
      ? [`可售超过${STALE_COVER_DAYS}天`]
      : [daysSinceLastSale === null ? '从未销售' : `${SALES_LOOKBACK_DAYS}天无销售`];

  return {
    productId: input.productId,
    stockBoxes,
    avgDailyBoxes30d,
    daysOfCover,
    lastSaleAt: input.lastSaleAt,
    daysSinceLastSale,
    isOutOfStock,
    isWarning: warningReasons.length > 0,
    isStale,
    warningReasons,
    staleReasons
  };
}

export interface RiskProductInput {
  id: string;
  spec: number;
  stock: number;
  createdAt: Date | null;
  lastOutAt: Date | null;
}

export interface RiskTransactionInput {
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  occurredAt: Date;
}

export function calculateRiskByProduct(
  products: readonly RiskProductInput[],
  transactions: readonly RiskTransactionInput[],
  now: Date
): Record<string, ProductRiskMetrics> {
  const lookbackStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  lookbackStart.setDate(lookbackStart.getDate() - SALES_LOOKBACK_DAYS);

  const recentOutQtyByProduct: Record<string, number> = {};
  const lastSaleByProduct: Record<string, Date | null> = {};
  for (const product of products) {
    recentOutQtyByProduct[product.id] = 0;
    lastSaleByProduct[product.id] = product.lastOutAt;
  }

  for (const transaction of transactions) {
    if (transaction.type !== 'out' || !(transaction.productId in recentOutQtyByProduct)) continue;
    if (transaction.occurredAt >= lookbackStart) {
      recentOutQtyByProduct[transaction.productId] += transaction.quantity;
    }
    const currentLastSale = lastSaleByProduct[transaction.productId];
    if (!currentLastSale || transaction.occurredAt > currentLastSale) {
      lastSaleByProduct[transaction.productId] = transaction.occurredAt;
    }
  }

  const metricsMap: Record<string, ProductRiskMetrics> = {};
  for (const product of products) {
    metricsMap[product.id] = calculateProductRisk({
      productId: product.id,
      spec: product.spec,
      stock: product.stock,
      createdAt: product.createdAt,
      lastSaleAt: lastSaleByProduct[product.id],
      outQuantity30d: recentOutQtyByProduct[product.id]
    }, now);
  }
  return metricsMap;
}

export const WORST_SELLER_MIN_STOCK_BOXES = 10;
export const WORST_SELLER_STOCKED_DAYS = 7;

// Styles that held at least WORST_SELLER_MIN_STOCK_BOXES throughout the last WORST_SELLER_STOCKED_DAYS
// and were listed before that window; only these can fairly be called worst sellers.
export function findSteadilyStockedProductIds(
  products: readonly Omit<RiskProductInput, 'lastOutAt'>[],
  transactions: readonly RiskTransactionInput[],
  now: Date
): Set<string> {
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  windowStart.setDate(windowStart.getDate() - WORST_SELLER_STOCKED_DAYS);

  const stockById = new Map(products.map((product) => [product.id, product.stock]));
  const minStockById = new Map(stockById);
  const windowTransactions = transactions
    .filter((transaction) => transaction.occurredAt >= windowStart && stockById.has(transaction.productId))
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());

  // Replay backwards from the current stock to recover every stock level held inside the window.
  for (const transaction of windowTransactions) {
    const before = stockById.get(transaction.productId)! + (transaction.type === 'out' ? transaction.quantity : -transaction.quantity);
    stockById.set(transaction.productId, before);
    minStockById.set(transaction.productId, Math.min(minStockById.get(transaction.productId)!, before));
  }

  return new Set(products
    .filter((product) => (
      (!product.createdAt || product.createdAt <= windowStart) &&
      minStockById.get(product.id)! / (product.spec > 0 ? product.spec : 1) >= WORST_SELLER_MIN_STOCK_BOXES
    ))
    .map((product) => product.id));
}
