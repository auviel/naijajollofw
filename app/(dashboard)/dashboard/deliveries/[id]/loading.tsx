import { DeliveryDetailSkeleton } from "@/components/features/deliveries/delivery-detail-skeleton";
import { DashboardPage, DashboardPageBody } from "@/components/layout/dashboard-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeliveryDetailLoading() {
  return (
    <DashboardPage>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <DashboardPageBody>
        <DeliveryDetailSkeleton />
      </DashboardPageBody>
    </DashboardPage>
  );
}
