import { Skeleton } from "@/components/ui/skeleton";

export function DeliveryDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <Skeleton className="h-5 w-32" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      </div>
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-border bg-surface-elevated p-5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-3 h-8 w-24" />
        </div>
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  );
}
