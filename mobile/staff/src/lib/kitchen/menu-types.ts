export type KitchenMenuImage = {
  id: string;
  url: string;
  sortOrder: number;
};

export type KitchenMenuItemDetail = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  images: KitchenMenuImage[];
  available: boolean;
};

export type KitchenMenuCategoryOption = {
  id: string;
  name: string;
  active: boolean;
};

export type KitchenMenuItemListRow = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  categoryName: string;
};

export type KitchenMenuCatalog = {
  categories: Array<{
    id: string;
    name: string;
    active: boolean;
    items: KitchenMenuItemListRow[];
  }>;
};

export type UploadMenuImageResult = {
  imageUrl: string;
  key: string;
  imageId: string;
  imageCount: number;
};

/** Parse a dollars string like "12.50" into cents. */
export function dollarsToCents(value: string): number | null {
  const trimmed = value.trim().replace(/^\$/, "");
  if (!trimmed) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  const dollars = Number.parseFloat(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

export function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
