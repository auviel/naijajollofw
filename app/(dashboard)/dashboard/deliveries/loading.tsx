import { DashboardPage, DashboardPageBody } from "@/components/layout/dashboard-page";
import { Skeleton } from "@/components/ui/skeleton";

/** Brief skeleton while /dashboard/deliveries redirects to courier orders. */
export default function DeliveriesLoading() {
  return (
    <DashboardPage>
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
      </div>
      <DashboardPageBody>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </DashboardPageBody>
    </DashboardPage>
  );
}
