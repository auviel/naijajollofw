import { DashboardPage, DashboardPageBody } from "@/components/layout/dashboard-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function StoreProfileLoading() {
  return (
    <DashboardPage>
      <div className="mb-6">
        <Skeleton className="h-8 w-40" />
      </div>
      <DashboardPageBody>
        <div className="mx-auto w-full max-w-4xl space-y-4">
          <Skeleton className="h-72 w-full rounded-lg" />
          <Skeleton className="h-12 w-40" />
        </div>
      </DashboardPageBody>
    </DashboardPage>
  );
}
