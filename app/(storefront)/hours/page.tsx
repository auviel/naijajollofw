import type { Metadata } from "next";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { HoursOrderingView } from "@/components/features/storefront/hours-ordering-view";
import { buildRestaurantJsonLd } from "@/lib/seo/json-ld";
import { buildShareMetadata } from "@/lib/seo/share-metadata";
import {
  getPublicStoreHoursSchedule,
  getPublicStoreOpenStatus,
} from "@/lib/services/store/store-hours";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";

export const metadata: Metadata = buildShareMetadata({
  title: "Hours & ordering",
  description:
    "Weekly hours, open status, and how pickup and delivery work at Naija Jollof Waterloo.",
  path: "/hours",
});

export default async function HoursOrderingPage() {
  const [{ store, prepMinutes }, openStatus, schedule] = await Promise.all([
    getPublicStorefront(),
    getPublicStoreOpenStatus(),
    getPublicStoreHoursSchedule(),
  ]);

  return (
    <>
      <JsonLdScript data={buildRestaurantJsonLd({ store, schedule })} />
      <HoursOrderingView
        store={store}
        openStatus={openStatus}
        schedule={schedule}
        prepMinutes={prepMinutes}
      />
    </>
  );
}
