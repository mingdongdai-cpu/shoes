export interface NamedProduct {
  id: string;
  name: string;
}

export function normalizeProductName(value: string): string {
  return value.trim().toLowerCase();
}

export function hasDuplicateProductName(
  products: NamedProduct[],
  name: string,
  excludedProductId?: string
): boolean {
  const normalizedName = normalizeProductName(name);
  return products.some((product) => (
    product.id !== excludedProductId && normalizeProductName(product.name) === normalizedName
  ));
}

export function findUniqueProductByName<T extends NamedProduct>(
  products: T[],
  name: string
): T | undefined {
  const normalizedName = normalizeProductName(name);
  if (!normalizedName) return undefined;

  const matches = products.filter(
    (product) => normalizeProductName(product.name) === normalizedName
  );
  return matches.length === 1 ? matches[0] : undefined;
}
