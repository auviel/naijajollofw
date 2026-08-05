import { unstable_cache } from "next/cache";
import { cache } from "react";
import { STOREFRONT_CACHE_TAG } from "@/lib/cache/storefront";
import { prisma } from "@/lib/db/client";
import { AppError } from "@/lib/utils/errors";

/**
 * Cross-request + cross-module store id lookup.
 * React `cache()` alone can miss when the resolver is bundled into multiple
 * server chunks (Sentry saw dozens of identical Store.findFirst calls per page).
 */
const loadPublicStoreId = unstable_cache(
  async (configuredId: string): Promise<string | null> => {
    if (configuredId) {
      const store = await prisma.store.findUnique({
        where: { id: configuredId },
        select: { id: true },
      });
      if (store) {
        return store.id;
      }
    }

    const first = await prisma.store.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    return first?.id ?? null;
  },
  ["public-store-id"],
  { revalidate: 300, tags: [STOREFRONT_CACHE_TAG] },
);

/** Single-restaurant public storefront — resolve which Store serves the shop. */
export const resolvePublicStoreId = cache(async function resolvePublicStoreId(): Promise<string> {
  const configured = process.env.PUBLIC_STORE_ID?.trim() ?? "";
  const id = await loadPublicStoreId(configured);

  if (!id) {
    throw new AppError("NOT_FOUND", "Restaurant is not set up yet.", 404);
  }

  return id;
});
