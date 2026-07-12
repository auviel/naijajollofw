import type {
  MenuCategory,
  MenuItem,
  MenuModifier,
  MenuModifierGroup,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type {
  MenuCatalog,
  MenuCategoryView,
  MenuItemDetail,
  MenuItemListItem,
  MenuModifierGroupView,
} from "@/lib/domain/menu/types";

type ModifierGroupWithModifiers = MenuModifierGroup & {
  modifiers: MenuModifier[];
};

type ItemWithRelations = MenuItem & {
  category: MenuCategory;
  modifierGroups: ModifierGroupWithModifiers[];
};

type CategoryWithItems = MenuCategory & {
  items: Array<
    MenuItem & {
      modifierGroups: Array<{ id: string }>;
    }
  >;
};

const itemDetailInclude = {
  category: true,
  modifierGroups: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    include: {
      modifiers: {
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      },
    },
  },
} satisfies Prisma.MenuItemInclude;

function mapModifierGroup(group: ModifierGroupWithModifiers): MenuModifierGroupView {
  return {
    id: group.id,
    name: group.name,
    required: group.required,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    sortOrder: group.sortOrder,
    modifiers: group.modifiers.map((modifier) => ({
      id: modifier.id,
      name: modifier.name,
      priceDeltaCents: modifier.priceDeltaCents,
      available: modifier.available,
      sortOrder: modifier.sortOrder,
    })),
  };
}

export function mapMenuItemToListItem(
  item: MenuItem & {
    category: MenuCategory;
    modifierGroups: Array<{ id: string }>;
  },
): MenuItemListItem {
  return {
    id: item.id,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    available: item.available,
    sortOrder: item.sortOrder,
    modifierGroupCount: item.modifierGroups.length,
  };
}

export function mapMenuItemToDetail(item: ItemWithRelations): MenuItemDetail {
  return {
    id: item.id,
    storeId: item.storeId,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
    available: item.available,
    sortOrder: item.sortOrder,
    modifierGroups: item.modifierGroups.map(mapModifierGroup),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function mapCategory(category: CategoryWithItems): MenuCategoryView {
  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    active: category.active,
    items: category.items.map((item) =>
      mapMenuItemToListItem({
        ...item,
        category,
      }),
    ),
  };
}

export type ModifierGroupWriteInput = {
  id?: string;
  name: string;
  required?: boolean;
  minSelect?: number;
  maxSelect?: number;
  sortOrder?: number;
  modifiers?: Array<{
    id?: string;
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
          include: {
            modifierGroups: { select: { id: true } },
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
          include: {
            modifierGroups: { select: { id: true } },
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
        category: { active: true },
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

async function replaceModifierGroups(
  tx: Prisma.TransactionClient,
  itemId: string,
  groups: ModifierGroupWriteInput[],
) {
  await tx.menuModifierGroup.deleteMany({ where: { itemId } });

  for (const [groupIndex, group] of groups.entries()) {
    const createdGroup = await tx.menuModifierGroup.create({
      data: {
        itemId,
        name: group.name,
        required: group.required ?? false,
        minSelect: group.minSelect ?? 0,
        maxSelect: group.maxSelect ?? 1,
        sortOrder: group.sortOrder ?? groupIndex,
      },
    });

    const modifiers = group.modifiers ?? [];
    if (modifiers.length === 0) {
      continue;
    }

    await tx.menuModifier.createMany({
      data: modifiers.map((modifier, modifierIndex) => ({
        groupId: createdGroup.id,
        name: modifier.name,
        priceDeltaCents: modifier.priceDeltaCents,
        available: modifier.available ?? true,
        sortOrder: modifier.sortOrder ?? modifierIndex,
      })),
    });
  }
}
