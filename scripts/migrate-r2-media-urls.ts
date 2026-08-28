/**
 * One-off: rewrite MenuItemImage.url and MenuItem.imageUrl from legacy r2.dev
 * to the current R2_PUBLIC_BASE_URL. Safe to re-run (idempotent).
 *
 * Usage: tsx scripts/migrate-r2-media-urls.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { getR2Config, isR2Configured } from "@/lib/integrations/r2/config";
import { normalizePublicMediaUrl } from "@/lib/integrations/r2/public-url";

async function main() {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured. Set R2_* env vars first.");
  }

  const { publicBaseUrl } = getR2Config();
  console.log(`Target public base: ${publicBaseUrl}`);

  const images = await prisma.menuItemImage.findMany({
    select: { id: true, url: true },
  });

  let imageUpdates = 0;
  for (const image of images) {
    const next = normalizePublicMediaUrl(image.url);
    if (next && next !== image.url) {
      await prisma.menuItemImage.update({
        where: { id: image.id },
        data: { url: next },
      });
      imageUpdates += 1;
    }
  }

  const items = await prisma.menuItem.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, imageUrl: true },
  });

  let itemUpdates = 0;
  for (const item of items) {
    const next = normalizePublicMediaUrl(item.imageUrl);
    if (next && next !== item.imageUrl) {
      await prisma.menuItem.update({
        where: { id: item.id },
        data: { imageUrl: next },
      });
      itemUpdates += 1;
    }
  }

  console.log(
    `Done. Updated ${imageUpdates} MenuItemImage rows and ${itemUpdates} MenuItem.imageUrl rows.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
