import { DashboardPage, DashboardPageBody } from "@/components/layout/dashboard-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewDeliveryLoading() {
  return (
    <DashboardPage>
      <div className="mb-6">
        <Skeleton className="h-8 w-44" />
      </div>
      <DashboardPageBody>
        <div className="mx-auto w-full max-w-4xl space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </DashboardPageBody>
    </DashboardPage>
  );
}
