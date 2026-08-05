import type {
  MenuCategory,
  MenuItem,
  MenuItemImage,
  MenuModifier,
  MenuModifierGroup,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { MODIFIER_GROUP_MAX_SELECT_DEFAULT } from "@/lib/domain/menu/limits";
import { resolveModifierGroupView } from "@/lib/domain/menu/resolve-modifiers";
import type {
  MenuCatalog,
  MenuCategoryView,
  MenuItemDetail,
  MenuItemImageView,
  MenuItemListItem,
  MenuPickerItem,
} from "@/lib/domain/menu/types";

type SourceItemRow = Pick<
  MenuItem,
  "id" | "name" | "priceCents" | "available" | "sortOrder"
>;

type ModifierWithSource = MenuModifier & {
  sourceItem: SourceItemRow | null;
};

type ModifierGroupWithModifiers = MenuModifierGroup & {
  sourceCategory: { items: SourceItemRow[] } | null;
  modifiers: ModifierWithSource[];
};

type CatalogItemRow = MenuItem & {
  modifierGroups: Array<{ id: string }>;
  images: Array<{ id: string; url: string }>;
};

type CategoryWithItems = MenuCategory & {
  items: CatalogItemRow[];
  itemLinks: Array<{
    sortOrder: number;
    item: CatalogItemRow & { categoryId: string };
  }>;
};

type ItemWithRelations = MenuItem & {
  category: MenuCategory;
  categoryLinks: Array<{ categoryId: string; sortOrder: number }>;
  modifierGroups: ModifierGroupWithModifiers[];
  images: MenuItemImage[];
};

const itemImagesInclude = {
  orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
} satisfies Prisma.MenuItem$imagesArgs;

const sourceItemSelect = {
  id: true,
  name: true,
  priceCents: true,
  available: true,
  sortOrder: true,
} satisfies Prisma.MenuItemSelect;

const catalogItemInclude = {
  modifierGroups: { select: { id: true } },
  images: {
    select: { id: true, url: true },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
} satisfies Prisma.MenuItemInclude;

const itemDetailInclude = {
  category: true,
  categoryLinks: {
    select: { categoryId: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" as const }],
  },
  images: itemImagesInclude,
  modifierGroups: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    include: {
      sourceCategory: {
        include: {
          items: {
            select: sourceItemSelect,
            orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
          },
        },
      },
      modifiers: {
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
        include: {
          sourceItem: { select: sourceItemSelect },
        },
      },
    },
  },
} satisfies Prisma.MenuItemInclude;

function mapImages(
  images: MenuItemImage[],
  fallbackUrl: string | null,
): MenuItemImageView[] {
  if (images.length > 0) {
    return images.map((image) => ({
      id: image.id,
      url: image.url,
      sortOrder: image.sortOrder,
    }));
  }
  if (fallbackUrl) {
    return [{ id: "legacy", url: fallbackUrl, sortOrder: 0 }];
  }
  return [];
}

function mapModifierGroup(
  group: ModifierGroupWithModifiers,
  hostItemId: string,
) {
  return resolveModifierGroupView(
    {
      id: group.id,
      name: group.name,
      required: group.required,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      sortOrder: group.sortOrder,
      sourceCategoryId: group.sourceCategoryId,
      sourceCategoryItems: group.sourceCategory?.items ?? null,
      modifiers: group.modifiers.map((modifier) => ({
        id: modifier.id,
        name: modifier.name,
        priceDeltaCents: modifier.priceDeltaCents,
        available: modifier.available,
        sortOrder: modifier.sortOrder,
        sourceItem: modifier.sourceItem,
      })),
    },
    hostItemId,
  );
}

export function mapMenuItemToListItem(
  item: MenuItem & {
    category: MenuCategory;
    modifierGroups: Array<{ id: string }>;
    images: Array<{ id: string; url: string }>;
  },
): MenuItemListItem {
  return {
    id: item.id,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    imageUrl: item.images[0]?.url ?? item.imageUrl,
    available: item.available,
    sortOrder: item.sortOrder,
    modifierGroupCount: item.modifierGroups.length,
    imageCount: item.images.length > 0 ? item.images.length : item.imageUrl ? 1 : 0,
  };
}

export function mapMenuItemToDetail(item: ItemWithRelations): MenuItemDetail {
  return {
    id: item.id,
    storeId: item.storeId,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    additionalCategoryIds: item.categoryLinks
      .map((link) => link.categoryId)
      .filter((id) => id !== item.categoryId),
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
    images: mapImages(item.images, item.imageUrl),
    available: item.available,
    sortOrder: item.sortOrder,
    modifierGroups: item.modifierGroups.map((group) =>
      mapModifierGroup(group, item.id),
    ),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function mapCategory(category: CategoryWithItems): MenuCategoryView {
  const byId = new Map<
    string,
    { item: CatalogItemRow; sortOrder: number }
  >();

  for (const item of category.items) {
    byId.set(item.id, { item, sortOrder: item.sortOrder });
  }
  for (const link of category.itemLinks) {
    if (byId.has(link.item.id)) continue;
    byId.set(link.item.id, { item: link.item, sortOrder: link.sortOrder });
  }

  const items = [...byId.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.item.name.localeCompare(b.item.name))
    .map(({ item, sortOrder }) =>
      mapMenuItemToListItem({
        ...item,
        sortOrder,
        category,
      }),
    );

  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    active: category.active,
    items,
  };
}

export type ModifierGroupWriteInput = {
  id?: string;
  name: string;
  required?: boolean;
  minSelect?: number;
  maxSelect?: number;
  sortOrder?: number;
  sourceCategoryId?: string | null;
  sourceItemIds?: string[];
  modifiers?: Array<{
    id?: string;
    sourceItemId?: string | null;
    name: string;
    priceDeltaCents: number;
    available?: boolean;
    sortOrder?: number;
  }>;
};

export const menuRepository = {
  async getCatalogForStore(storeId: string): Promise<MenuCatalog> {
    const categories = await prisma.menuCategory.findMany({
      where: { storeId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: catalogItemInclude,
        },
        itemLinks: {
          orderBy: [{ sortOrder: "asc" }],
          include: {
            item: { include: catalogItemInclude },
          },
        },
      },
    });

    return {
      categories: categories.map(mapCategory),
    };
  },

  /** Active categories only — sold-out items remain visible but flagged. */
  async getPublicCatalogForStore(storeId: string): Promise<MenuCatalog> {
    const categories = await prisma.menuCategory.findMany({
      where: { storeId, active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: catalogItemInclude,
        },
        itemLinks: {
          orderBy: [{ sortOrder: "asc" }],
          include: {
            item: { include: catalogItemInclude },
          },
        },
      },
    });

    return {
      categories: categories.map(mapCategory),
    };
  },

  async findPublicItemById(id: string, storeId: string) {
    return prisma.menuItem.findFirst({
      where: {
        id,
        storeId,
        OR: [
          { category: { active: true } },
          { categoryLinks: { some: { category: { active: true } } } },
        ],
      },
      include: itemDetailInclude,
    });
  },

  async listCategoriesForStore(storeId: string) {
    return prisma.menuCategory.findMany({
      where: { storeId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, sortOrder: true, active: true },
    });
  },

  async listPickerItemsForStore(storeId: string): Promise<MenuPickerItem[]> {
    const items = await prisma.menuItem.findMany({
      where: { storeId },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        id: true,
        name: true,
        priceCents: true,
        categoryId: true,
        available: true,
        category: { select: { name: true } },
      },
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      priceCents: item.priceCents,
      categoryId: item.categoryId,
      categoryName: item.category.name,
      available: item.available,
    }));
  },

  async findCategoryByIdAndStoreId(id: string, storeId: string) {
    return prisma.menuCategory.findFirst({
      where: { id, storeId },
    });
  },

  async createCategory(input: {
    storeId: string;
    name: string;
    sortOrder: number;
  }) {
    return prisma.menuCategory.create({
      data: {
        storeId: input.storeId,
        name: input.name,
        sortOrder: input.sortOrder,
      },
    });
  },

  async updateCategory(
    id: string,
    storeId: string,
    data: { name?: string; sortOrder?: number; active?: boolean },
  ) {
    const existing = await this.findCategoryByIdAndStoreId(id, storeId);
    if (!existing) {
      return null;
    }

    return prisma.menuCategory.update({
      where: { id },
      data,
    });
  },

  async findItemByIdAndStoreId(id: string, storeId: string) {
    return prisma.menuItem.findFirst({
      where: { id, storeId },
      include: itemDetailInclude,
    });
  },

  async createItem(input: {
    storeId: string;
    categoryId: string;
    additionalCategoryIds?: string[];
    name: string;
    description: string | null;
    priceCents: number;
    imageUrl: string | null;
    available: boolean;
    sortOrder: number;
    modifierGroups: ModifierGroupWriteInput[];
  }) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.menuItem.create({
        data: {
          storeId: input.storeId,
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
          priceCents: input.priceCents,
          imageUrl: input.imageUrl,
          available: input.available,
          sortOrder: input.sortOrder,
        },
      });

      await replaceAdditionalCategories(
        tx,
        item.id,
        input.additionalCategoryIds ?? [],
        input.categoryId,
      );
      await replaceModifierGroups(tx, item.id, input.modifierGroups);

      return tx.menuItem.findFirstOrThrow({
        where: { id: item.id },
        include: itemDetailInclude,
      });
    });
  },

  async updateItem(
    id: string,
    storeId: string,
    data: {
      categoryId?: string;
      additionalCategoryIds?: string[];
      name?: string;
      description?: string | null;
      priceCents?: number;
      imageUrl?: string | null;
      available?: boolean;
      sortOrder?: number;
      modifierGroups?: ModifierGroupWriteInput[];
    },
  ) {
    const existing = await this.findItemByIdAndStoreId(id, storeId);
    if (!existing) {
      return null;
    }

    return prisma.$transaction(async (tx) => {
      await tx.menuItem.update({
        where: { id },
        data: {
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          priceCents: data.priceCents,
          imageUrl: data.imageUrl,
          available: data.available,
          sortOrder: data.sortOrder,
        },
      });

      if (data.additionalCategoryIds !== undefined) {
        await replaceAdditionalCategories(
          tx,
          id,
          data.additionalCategoryIds,
          data.categoryId ?? existing.categoryId,
        );
      } else if (data.categoryId && data.categoryId !== existing.categoryId) {
        // Drop stale link if primary moved onto a former extra shelf.
        await tx.menuItemCategory.deleteMany({
          where: { itemId: id, categoryId: data.categoryId },
        });
      }

      if (data.modifierGroups) {
        await replaceModifierGroups(tx, id, data.modifierGroups);
      }

      return tx.menuItem.findFirstOrThrow({
        where: { id },
        include: itemDetailInclude,
      });
    });
  },

  async setItemAvailability(id: string, storeId: string, available: boolean) {
    const existing = await prisma.menuItem.findFirst({
      where: { id, storeId },
      select: { id: true },
    });
    if (!existing) {
      return null;
    }

    return prisma.menuItem.update({
      where: { id },
      data: { available },
      include: itemDetailInclude,
    });
  },

  async countImagesForItem(itemId: string) {
    return prisma.menuItemImage.count({ where: { itemId } });
  },

  async listImagesForItem(itemId: string) {
    return prisma.menuItemImage.findMany({
      where: { itemId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async addItemImage(input: {
    itemId: string;
    storeId: string;
    url: string;
    objectKey: string;
  }) {
    const item = await prisma.menuItem.findFirst({
      where: { id: input.itemId, storeId: input.storeId },
      include: { images: { select: { id: true, sortOrder: true } } },
    });
    if (!item) {
      return null;
    }

    const nextSort =
      item.images.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

    return prisma.$transaction(async (tx) => {
      const image = await tx.menuItemImage.create({
        data: {
          itemId: input.itemId,
          url: input.url,
          objectKey: input.objectKey || null,
          sortOrder: nextSort,
        },
      });

      // Keep denormalized cover URL as the first image.
      if (!item.imageUrl || item.images.length === 0) {
        await tx.menuItem.update({
          where: { id: input.itemId },
          data: { imageUrl: input.url },
        });
      }

      return image;
    });
  },

  async deleteItemImage(input: {
    itemId: string;
    storeId: string;
    imageId: string;
  }) {
    const item = await prisma.menuItem.findFirst({
      where: { id: input.itemId, storeId: input.storeId },
      include: {
        images: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });
    if (!item) {
      return null;
    }

    const target = item.images.find((image) => image.id === input.imageId);
    if (!target) {
      return null;
    }

    return prisma.$transaction(async (tx) => {
      await tx.menuItemImage.delete({ where: { id: target.id } });
      const remaining = item.images.filter((image) => image.id !== target.id);
      const nextPrimary = remaining[0]?.url ?? null;
      await tx.menuItem.update({
        where: { id: input.itemId },
        data: { imageUrl: nextPrimary },
      });
      return { deleted: target, remaining };
    });
  },

  async clearItemImages(itemId: string, storeId: string) {
    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, storeId },
      include: { images: true },
    });
    if (!item) {
      return null;
    }

    await prisma.$transaction(async (tx) => {
      await tx.menuItemImage.deleteMany({ where: { itemId } });
      await tx.menuItem.update({
        where: { id: itemId },
        data: { imageUrl: null },
      });
    });

    return item.images;
  },

  async nextCategorySortOrder(storeId: string) {
    const last = await prisma.menuCategory.findFirst({
      where: { storeId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? -1) + 1;
  },

  async nextItemSortOrder(storeId: string, categoryId: string) {
    const last = await prisma.menuItem.findFirst({
      where: { storeId, categoryId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? -1) + 1;
  },
};

async function replaceAdditionalCategories(
  tx: Prisma.TransactionClient,
  itemId: string,
  categoryIds: string[],
  primaryCategoryId: string,
) {
  const unique = [
    ...new Set(categoryIds.filter((id) => id && id !== primaryCategoryId)),
  ];

  await tx.menuItemCategory.deleteMany({ where: { itemId } });
  if (unique.length === 0) {
    return;
  }

  const rows: Array<{ itemId: string; categoryId: string; sortOrder: number }> =
    [];
  for (const categoryId of unique) {
    const maxPrimary = await tx.menuItem.aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    });
    const maxLinked = await tx.menuItemCategory.aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    });
    const next =
      Math.max(maxPrimary._max.sortOrder ?? -1, maxLinked._max.sortOrder ?? -1) +
      1;
    rows.push({ itemId, categoryId, sortOrder: next });
  }

  await tx.menuItemCategory.createMany({ data: rows });
}

async function replaceModifierGroups(
  tx: Prisma.TransactionClient,
  itemId: string,
  groups: ModifierGroupWriteInput[],
) {
  await tx.menuModifierGroup.deleteMany({ where: { itemId } });

  const host = await tx.menuItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { storeId: true },
  });

  for (const [groupIndex, group] of groups.entries()) {
    const sourceCategoryId = group.sourceCategoryId || null;
    const createdGroup = await tx.menuModifierGroup.create({
      data: {
        itemId,
        name: group.name,
        required: group.required ?? false,
        minSelect: group.minSelect ?? 0,
        maxSelect: group.maxSelect ?? MODIFIER_GROUP_MAX_SELECT_DEFAULT,
        sortOrder: group.sortOrder ?? groupIndex,
        sourceCategoryId,
      },
    });

    if (sourceCategoryId) {
      continue;
    }

    const sourceItemIds = [
      ...new Set(
        (group.sourceItemIds ?? []).filter((id) => id && id !== itemId),
      ),
    ];
    const sourceItems =
      sourceItemIds.length > 0
        ? await tx.menuItem.findMany({
            where: { storeId: host.storeId, id: { in: sourceItemIds } },
            select: {
              id: true,
              name: true,
              priceCents: true,
            },
          })
        : [];
    const sourceById = new Map(sourceItems.map((row) => [row.id, row]));

    const linkedRows = sourceItemIds.flatMap((sourceItemId, index) => {
      const source = sourceById.get(sourceItemId);
      if (!source) {
        return [];
      }
      return [
        {
          groupId: createdGroup.id,
          sourceItemId: source.id,
          name: source.name,
          priceDeltaCents: source.priceCents,
          available: true,
          sortOrder: index,
        },
      ];
    });

    const legacyRows = (group.modifiers ?? [])
      .filter((modifier) => !modifier.sourceItemId)
      .map((modifier, index) => ({
        groupId: createdGroup.id,
        sourceItemId: null as string | null,
        name: modifier.name,
        priceDeltaCents: modifier.priceDeltaCents,
        available: modifier.available ?? true,
        sortOrder: linkedRows.length + (modifier.sortOrder ?? index),
      }));

    const rows = [...linkedRows, ...legacyRows];
    if (rows.length === 0) {
      continue;
    }

    await tx.menuModifier.createMany({ data: rows });
  }
}
