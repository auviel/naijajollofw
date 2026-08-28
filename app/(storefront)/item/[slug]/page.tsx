import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ItemDetailClient } from "@/components/features/storefront/item-detail-client";
import { buildShareMetadata } from "@/lib/seo/share-metadata";
import { getPublicStoreOpenStatus } from "@/lib/services/store/store-hours";
import { getPublicMenuItem } from "@/lib/services/storefront/get-public-menu";
import { isAppError } from "@/lib/utils/errors";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { item, shouldRedirectToSlug } = await getPublicMenuItem(slug);
    if (shouldRedirectToSlug) {
      return { title: item.name };
    }
    const imageUrl = item.images[0]?.url ?? item.imageUrl;
    const description =
      item.description?.trim() ||
      `Order ${item.name} from Naija Jollof Waterloo. Pickup or delivery.`;

    return buildShareMetadata({
      title: item.name,
      description,
      imageUrl,
      imageAlt: item.name,
      path: `/item/${item.slug}`,
    });
  } catch (error) {
    if (isAppError(error) && error.status === 404) {
      return { title: "Menu item" };
    }
    throw error;
  }
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let item;
  let openStatus;
  let shouldRedirectToSlug = false;
  try {
    const [resolved, status] = await Promise.all([
      getPublicMenuItem(slug),
      getPublicStoreOpenStatus(),
    ]);
    item = resolved.item;
    shouldRedirectToSlug = resolved.shouldRedirectToSlug;
    openStatus = status;
  } catch (error) {
    if (isAppError(error) && error.status === 404) {
      notFound();
    }
    throw error;
  }

  if (shouldRedirectToSlug) {
    permanentRedirect(`/item/${item.slug}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ItemDetailClient
        item={item}
        scheduleLabel={openStatus.isOpen ? null : openStatus.nextOpenLabel}
      />
    </div>
  );
}
