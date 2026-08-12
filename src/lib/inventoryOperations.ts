export interface BatchOutLine {
  productId: string;
  boxes: number;
}

export interface AggregatedBatchOutLine {
  productId: string;
  boxes: number;
}

export function aggregateBatchOutLines(lines: BatchOutLine[]): AggregatedBatchOutLine[] {
  const boxesByProductId = new Map<string, number>();

  for (const line of lines) {
    boxesByProductId.set(
      line.productId,
      (boxesByProductId.get(line.productId) ?? 0) + line.boxes
    );
  }

  return [...boxesByProductId].map(([productId, boxes]) => ({ productId, boxes }));
}

export function getStockAfterTransactionDeletion(
  currentStock: number,
  type: 'in' | 'out',
  quantity: number
): number {
  return type === 'in' ? currentStock - quantity : currentStock + quantity;
}
