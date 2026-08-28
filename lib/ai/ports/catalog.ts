/** Vertical-agnostic catalog search shape (menu/pharmacy map into this). */
export type CatalogSearchItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  /** Storefront shelf name — used for drink/category-aware ranking. */
  categoryName?: string | null;
};

export type CatalogOptionGroup = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: Array<{
    id: string;
    name: string;
    priceDeltaCents: number;
    available: boolean;
  }>;
};

export type CatalogProductDetail = CatalogSearchItem & {
  optionGroups: CatalogOptionGroup[];
};

export type CatalogPort = {
  search(query: string, limit?: number): Promise<CatalogSearchItem[]>;
  getBySlugOrId(slugOrId: string): Promise<CatalogProductDetail | null>;
};
