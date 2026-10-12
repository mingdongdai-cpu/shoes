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
