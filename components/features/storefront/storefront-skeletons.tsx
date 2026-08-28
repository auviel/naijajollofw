import { Skeleton } from "@/components/ui/skeleton";

/** Cart drawer line rows + sticky checkout bar. */
export function CartDrawerSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      aria-busy="true"
      aria-label="Loading cart"
    >
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-16 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2 py-0.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            <Skeleton className="h-4 w-12 shrink-0" />
          </div>
        ))}
      </div>
      <div className="shrink-0 space-y-3 border-t border-black/5 px-5 py-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

/** Menu grid used for AI search loading and Suspense shell. */
export function MenuCatalogBrowseSkeleton({
  cardCount = 8,
}: {
  cardCount?: number;
}) {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading menu results"
    >
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: cardCount }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full homepage shell — hero + chips + dish grid. */
export function StorefrontMenuPageSkeleton() {
  return (
    <div
      className="space-y-8"
      aria-busy="true"
      aria-label="Loading menu"
    >
      <div className="space-y-4">
        <Skeleton className="aspect-[16/10] w-full rounded-3xl sm:aspect-[21/9]" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <MenuCatalogBrowseSkeleton cardCount={8} />
    </div>
  );
}

/** Full `/item/[slug]` page while the server segment resolves. */
export function ItemDetailPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-6"
      aria-busy="true"
      aria-label="Loading item"
    >
      <Skeleton className="aspect-[4/3] w-full rounded-2xl sm:aspect-[16/10]" />
      <div className="space-y-3 px-1">
        <Skeleton className="h-8 w-2/3 max-w-sm" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-5/6 max-w-sm" />
      </div>
      <div className="space-y-3 border-t border-black/5 pt-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

/** Auth form fields inside the elevated card. */
export function AuthFormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Loading form"
    >
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="mt-2 h-11 w-full rounded-full" />
    </div>
  );
}

/** Account section soft-nav placeholder. */
export function AccountSectionSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading account"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-2xl bg-surface-elevated px-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 max-w-xs" />
              <Skeleton className="h-3 w-1/2 max-w-[12rem]" />
            </div>
            <Skeleton className="h-4 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Dropdown result rows while typeahead searches. */
export function AutocompleteListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="px-4 py-3" aria-hidden>
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </li>
      ))}
    </>
  );
}

/** Dashboard global search panel while fetching. */
export function DashboardSearchHitsSkeleton() {
  return (
    <div className="space-y-1 py-2" aria-busy="true" aria-label="Searching">
      <p className="px-4 pt-1 pb-1 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
        Searching
      </p>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-2.5">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
