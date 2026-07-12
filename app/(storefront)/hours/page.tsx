import type { Metadata } from "next";
import { HoursOrderingView } from "@/components/features/storefront/hours-ordering-view";
import {
  getPublicStoreHoursSchedule,
  getPublicStoreOpenStatus,
} from "@/lib/services/store/store-hours";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";

export const metadata: Metadata = {
  title: "Hours & ordering",
  description:
    "Weekly hours, open status, and how pickup and delivery work at Naija Jollof Waterloo.",
};

export default async function HoursOrderingPage() {
  const [{ store, prepMinutes }, openStatus, schedule] = await Promise.all([
    getPublicStorefront(),
    getPublicStoreOpenStatus(),
    getPublicStoreHoursSchedule(),
  ]);

  return (
    <HoursOrderingView
      store={store}
      openStatus={openStatus}
      schedule={schedule}
      prepMinutes={prepMinutes}
    />
  );
}
