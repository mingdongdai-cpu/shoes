import { CARGO_CONTAINER_STATUSES, type CargoContainer, type CargoContainerItem, type CargoContainerStatus, type Product } from '../types';
import { isOrderDate } from './customerOrders';

type SortableCargoContainer = Pick<CargoContainer, 'id' | 'status' | 'arrivalDate' | 'createdAt'>;

export function compareCargoContainers(left: SortableCargoContainer, right: SortableCargoContainer): number {
  const statusOrder = CARGO_CONTAINER_STATUSES.indexOf(left.status) - CARGO_CONTAINER_STATUSES.indexOf(right.status);
  if (statusOrder !== 0) return statusOrder;

  if (left.status === '在途') {
    if (left.arrivalDate === null || right.arrivalDate === null) {
      if (left.arrivalDate !== right.arrivalDate) return left.arrivalDate === null ? -1 : 1;
    } else {
      const arrivalOrder = left.arrivalDate.localeCompare(right.arrivalDate);
      if (arrivalOrder !== 0) return arrivalOrder;
    }
  }

  return right.createdAt.toMillis() - left.createdAt.toMillis() || left.id.localeCompare(right.id);
}

export function areCargoContainerDatesValid(
  status: CargoContainerStatus,
  arrivalDate: string | null,
  stockedDate: string | null
): boolean {
  return (arrivalDate === null || isOrderDate(arrivalDate)) &&
    (status === '到库' ? stockedDate !== null && isOrderDate(stockedDate) : stockedDate === null);
}

export function getCargoContainerCardDate(
  container: Pick<CargoContainer, 'status' | 'arrivalDate' | 'stockedDate'>
): { label: string; value: string } {
  return container.status === '到库'
    ? { label: '到库日期', value: container.stockedDate ?? '待定' }
    : { label: '预计到港日期', value: container.arrivalDate ?? '待定' };
}

export interface CargoContainerDraftLine {
  product: Pick<Product, 'id' | 'name' | 'spec'>;
  boxes: number;
}

export function buildCargoContainerItems(lines: CargoContainerDraftLine[]): CargoContainerItem[] {
  const productIds = new Set<string>();

  return lines.map(({ product, boxes }) => {
    if (!Number.isInteger(boxes) || boxes <= 0) {
      throw new Error('箱数必须是大于0的整数');
    }
    if (productIds.has(product.id)) {
      throw new Error(`商品 ${product.name} 不能重复录入`);
    }
    productIds.add(product.id);

    return {
      productId: product.id,
      productName: product.name,
      spec: product.spec,
      boxes,
      quantity: boxes * product.spec
    };
  });
}

export function getCargoContainerTotalBoxes(items: readonly CargoContainerItem[]): number {
  return items.reduce((total, item) => total + item.boxes, 0);
}

export function resolveCargoContainerBoxes(items: readonly CargoContainerItem[], fallbackBoxes: number): number {
  if (items.length > 0) return getCargoContainerTotalBoxes(items);
  if (!Number.isInteger(fallbackBoxes) || fallbackBoxes <= 0) {
    throw new Error('请输入货物总箱数');
  }
  return fallbackBoxes;
}
