import { notFound } from "next/navigation";
import { ItemDetailClient } from "@/components/features/storefront/item-detail-client";
import { getPublicStoreOpenStatus } from "@/lib/services/store/store-hours";
import { getPublicMenuItem } from "@/lib/services/storefront/get-public-menu";
import { isAppError } from "@/lib/utils/errors";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ItemDetailPage({ params }: PageProps) {
  const { id } = await params;

  let item;
  let openStatus;
  try {
    [{ item }, openStatus] = await Promise.all([
      getPublicMenuItem(id),
      getPublicStoreOpenStatus(),
    ]);
  } catch (error) {
    if (isAppError(error) && error.status === 404) {
      notFound();
    }
    throw error;
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
