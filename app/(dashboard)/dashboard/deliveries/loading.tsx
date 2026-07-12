import { DeliveryListSkeleton } from "@/components/features/deliveries/delivery-list-skeleton";
import { DashboardPage, DashboardPageBody } from "@/components/layout/dashboard-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeliveriesLoading() {
  return (
    <DashboardPage>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-36" />
      </div>
      <Skeleton className="mb-6 h-12 w-full max-w-xl" />
      <DashboardPageBody>
        <DeliveryListSkeleton />
      </DashboardPageBody>
    </DashboardPage>
  );
}
