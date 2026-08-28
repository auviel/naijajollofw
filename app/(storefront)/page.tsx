import type { Metadata } from "next";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { StorefrontMenu } from "@/components/features/storefront/storefront-menu";
import {
  buildFaqPageJsonLd,
  buildRestaurantJsonLd,
} from "@/lib/seo/json-ld";
import { buildShareMetadata } from "@/lib/seo/share-metadata";
import { buildStorefrontFaqEntries } from "@/lib/seo/storefront-faq";
import { getCart } from "@/lib/services/cart/cart-actions";
import {
  getPublicStoreHoursSchedule,
  getPublicStoreOpenStatus,
} from "@/lib/services/store/store-hours";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

const homeDescription =
  "Order smoky jollof, rich stews, and party trays from Naija Jollof Waterloo. Pickup or delivery.";

export const metadata: Metadata = buildShareMetadata({
  title: "Naija Jollof Waterloo",
  description: homeDescription,
  path: "/",
});

export default async function StorefrontHomePage({ searchParams }: PageProps) {
  const [{ q }, { store, catalog, prepMinutes }, cart, openStatus, schedule] =
    await Promise.all([
      searchParams,
      getPublicStorefront(),
      getCart(),
      getPublicStoreOpenStatus(),
      getPublicStoreHoursSchedule(),
    ]);

  const faqEntries = buildStorefrontFaqEntries({
    store,
    prepMinutes,
    todayLabel: openStatus.todayLabel,
  });

  return (
    <>
      <JsonLdScript
        data={[
          buildRestaurantJsonLd({ store, schedule }),
          buildFaqPageJsonLd(faqEntries),
        ]}
      />
      <StorefrontMenu
        store={store}
        catalog={catalog}
        cartItemCount={cart.itemCount}
        cartSubtotalCents={cart.subtotalCents}
        openStatus={openStatus}
        prepMinutes={prepMinutes}
        searchQuery={q?.trim() ?? ""}
      />
    </>
  );
}
