import type { Metadata } from "next";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { StorefrontMenu } from "@/components/features/storefront/storefront-menu";
import {
  buildFaqPageJsonLd,
  buildRestaurantJsonLd,
} from "@/lib/seo/json-ld";
import { buildShareMetadata } from "@/lib/seo/share-metadata";
import { buildStorefrontFaqEntries } from "@/lib/seo/storefront-faq";
import { getPublicGoogleRating } from "@/lib/integrations/google/places/get-public-google-rating";
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

/** Public catalog page — no cookies(); OpenNext ISR can cache the document. */
export const revalidate = 300;

export const metadata: Metadata = buildShareMetadata({
  title: "Naija Jollof Waterloo",
  description: homeDescription,
  path: "/",
});

export default async function StorefrontHomePage({ searchParams }: PageProps) {
  const [{ q }, { store, catalog, prepMinutes }, openStatus, schedule, googleRating] =
    await Promise.all([
      searchParams,
      getPublicStorefront(),
      getPublicStoreOpenStatus(),
      getPublicStoreHoursSchedule(),
      getPublicGoogleRating(),
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
          buildRestaurantJsonLd({ store, schedule, googleRating }),
          buildFaqPageJsonLd(faqEntries),
        ]}
      />
      <StorefrontMenu
        store={store}
        catalog={catalog}
        openStatus={openStatus}
        prepMinutes={prepMinutes}
        googleRating={googleRating}
        searchQuery={q?.trim() ?? ""}
      />
    </>
  );
}
