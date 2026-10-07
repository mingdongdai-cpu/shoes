export interface BatchLine {
  productId: string;
  boxes: number;
}

export interface AggregatedBatchLine {
  productId: string;
  boxes: number;
}

export function aggregateBatchLines(lines: BatchLine[]): AggregatedBatchLine[] {
  const boxesByProductId = new Map<string, number>();

  for (const line of lines) {
    boxesByProductId.set(
      line.productId,
      (boxesByProductId.get(line.productId) ?? 0) + line.boxes
    );
  }

  return [...boxesByProductId].map(([productId, boxes]) => ({ productId, boxes }));
}

export function getStockAfterBatchTransaction(
  currentStock: number,
  type: 'in' | 'out',
  quantity: number
): number {
  return currentStock + (type === 'in' ? quantity : -quantity);
}

export function getStockAfterTransactionDeletion(
  currentStock: number,
  type: 'in' | 'out',
  quantity: number
): number {
  return type === 'in' ? currentStock - quantity : currentStock + quantity;
}
