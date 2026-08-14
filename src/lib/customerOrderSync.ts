import type { CustomerOrder } from '../types';

export interface CustomerOrderInventoryLine {
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
  unitPrice: number;
}

export function aggregateCustomerOrdersForInventory(orders: CustomerOrder[]): CustomerOrderInventoryLine[] {
  const byProduct = new Map<string, CustomerOrderInventoryLine>();
  for (const order of orders) {
    for (const item of order.items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.subtotal) || item.subtotal < 0) {
        throw new Error(`订单“${order.customerName}”包含无效商品明细`);
      }
      const current = byProduct.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        quantity: 0,
        amount: 0,
        unitPrice: 0
      };
      current.quantity += item.quantity;
      current.amount += item.subtotal;
      current.unitPrice = current.amount / current.quantity;
      byProduct.set(item.productId, current);
    }
  }
  return [...byProduct.values()].sort((left, right) => left.productName.localeCompare(right.productName));
}
