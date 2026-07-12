import { prisma } from "@/lib/db/client";
import { storeRepository } from "@/lib/db/repositories/store.repository";
import { AppError } from "@/lib/utils/errors";

/** Single-restaurant public storefront — resolve which Store serves the shop. */
export async function resolvePublicStoreId(): Promise<string> {
  const configured = process.env.PUBLIC_STORE_ID?.trim();
  if (configured) {
    const store = await storeRepository.findById(configured);
    if (store) {
      return store.id;
    }
  }

  const first = await prisma.store.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!first) {
    throw new AppError("NOT_FOUND", "Restaurant is not set up yet.", 404);
  }

  return first.id;
}
