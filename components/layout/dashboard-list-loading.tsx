import { DashboardPage, DashboardPageBody } from "@/components/layout/dashboard-page";
import { Skeleton } from "@/components/ui/skeleton";

/** Shared header + body skeleton for dashboard list/board pages. */
export function DashboardListLoading({
  rows = 5,
  board = false,
}: {
  rows?: number;
  board?: boolean;
}) {
  return (
    <DashboardPage>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-12 w-36" />
      </div>
      <DashboardPageBody>
        {board ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, column) => (
              <div key={column} className="space-y-2 rounded-2xl border border-border p-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-28 w-full rounded-md" />
                <Skeleton className="h-28 w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: rows }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        )}
      </DashboardPageBody>
    </DashboardPage>
  );
}
