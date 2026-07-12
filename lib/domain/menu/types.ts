export type MenuModifierView = {
  id: string;
  name: string;
  priceDeltaCents: number;
  available: boolean;
  sortOrder: number;
};

export type MenuModifierGroupView = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  modifiers: MenuModifierView[];
};

export type MenuItemListItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  sortOrder: number;
  modifierGroupCount: number;
};

export type MenuItemDetail = {
  id: string;
  storeId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  sortOrder: number;
  modifierGroups: MenuModifierGroupView[];
  createdAt: Date;
  updatedAt: Date;
};

export type MenuCategoryView = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  items: MenuItemListItem[];
};

export type MenuCatalog = {
  categories: MenuCategoryView[];
};
