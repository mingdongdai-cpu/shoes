import type { CustomerOrder, CustomerOrderItem, OrderProduct } from '../types';

const togoOrderDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

export interface CustomerOrderDraftLine {
  product: OrderProduct;
  boxes: number;
}

export interface CustomerOrderTotals {
  items: CustomerOrderItem[];
  totalAmount: number;
}

export function buildCustomerOrderTotals(lines: CustomerOrderDraftLine[]): CustomerOrderTotals {
  const items = lines.map(({ product, boxes }) => {
    if (!Number.isInteger(boxes) || boxes <= 0) {
      throw new Error('箱数必须是大于0的整数');
    }

    const quantity = boxes * product.spec;
    return {
      productId: product.id,
      productName: product.name,
      spec: product.spec,
      unitPrice: product.price,
      boxes,
      quantity,
      subtotal: quantity * product.price
    };
  });

  return {
    items,
    totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0)
  };
}

export function isOrderDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getTogoOrderDate(date = new Date()): string {
  const dateParts = Object.fromEntries(
    togoOrderDateFormatter
      .formatToParts(date)
      .filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day')
      .map((part) => [part.type, part.value])
  );
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export function filterCustomerOrdersByDate<T extends { orderDate: string }>(orders: readonly T[], selectedDate: string): T[] {
  return orders.filter((order) => order.orderDate === selectedDate);
}

export function normalizeCustomerOrderUnpaid(value: unknown): boolean {
  return value === true;
}

export function normalizeCustomerOrderPaidAmount(value: unknown, isUnpaid: boolean, totalAmount: number): number {
  if (isUnpaid) return 0;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return totalAmount;
  return value;
}

export function normalizeCustomerOrderDebtHistory(value: unknown): boolean {
  return value === true;
}

export type CustomerOrderPaymentStatus = 'unpaid' | 'underpaid' | 'overpaid' | 'paid';

export function getCustomerOrderBalance(order: Pick<CustomerOrder, 'totalAmount' | 'paidAmount'>): number {
  return order.totalAmount - order.paidAmount;
}

export function getCustomerOrderPaymentStatus(
  order: Pick<CustomerOrder, 'isUnpaid' | 'totalAmount' | 'paidAmount'>
): CustomerOrderPaymentStatus {
  if (order.isUnpaid) return 'unpaid';
  const balance = getCustomerOrderBalance(order);
  if (balance > 0) return 'underpaid';
  if (balance < 0) return 'overpaid';
  return 'paid';
}

export function isCustomerOrderDebt(order: Pick<CustomerOrder, 'isUnpaid' | 'totalAmount' | 'paidAmount'>): boolean {
  const status = getCustomerOrderPaymentStatus(order);
  return status === 'unpaid' || status === 'underpaid';
}

export function getCustomerOrderOutstanding(order: Pick<CustomerOrder, 'totalAmount' | 'paidAmount'>): number {
  return Math.max(0, getCustomerOrderBalance(order));
}

export function shouldShowCustomerOrderInDebtHistory(
  order: Pick<CustomerOrder, 'hasDebtHistory' | 'isUnpaid' | 'totalAmount' | 'paidAmount'>
): boolean {
  return order.hasDebtHistory || isCustomerOrderDebt(order);
}
