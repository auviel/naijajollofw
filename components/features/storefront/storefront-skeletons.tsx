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

/** Full `/cart` page while cart + cookies resolve. */
export function CartPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-6"
      aria-busy="true"
      aria-label="Loading cart"
    >
      <Skeleton className="h-9 w-28" />
      <div className="space-y-4 rounded-2xl bg-surface-elevated p-4 sm:p-5">
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
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

/** Full `/checkout` page shell. */
export function CheckoutPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-8"
      aria-busy="true"
      aria-label="Loading checkout"
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <div className="rounded-xl border border-border bg-surface-elevated px-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-2/3 max-w-xs" />
              </div>
              <Skeleton className="h-4 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

/** Public `/orders/[id]` tracking page. */
export function OrderStatusPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-6"
      aria-busy="true"
      aria-label="Loading order"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="space-y-4 rounded-2xl bg-surface-elevated p-5">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-52 max-w-full" />
        <div className="flex gap-2 pt-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-2 flex-1 rounded-full" />
          ))}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl bg-surface-elevated p-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex justify-between gap-3">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  );
}

/** `/hours` content shell. */
export function HoursPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-10 pb-8"
      aria-busy="true"
      aria-label="Loading hours"
    >
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="space-y-3 rounded-2xl bg-surface-elevated px-5 py-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="divide-y divide-border rounded-2xl bg-surface-elevated px-5">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex items-center justify-between py-3.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Blog index while Sanity resolves. */
export function BlogIndexPageSkeleton() {
  return (
    <div
      className="space-y-8 py-2 sm:py-4"
      aria-busy="true"
      aria-label="Loading blog"
    >
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <Skeleton className="mx-auto h-9 w-32" />
        <Skeleton className="mx-auto h-4 w-64 max-w-full" />
      </div>
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Single blog post shell. */
export function BlogPostPageSkeleton() {
  return (
    <article
      className="mx-auto w-full max-w-2xl space-y-6 py-4"
      aria-busy="true"
      aria-label="Loading article"
    >
      <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
      <Skeleton className="h-9 w-4/5 max-w-md" />
      <Skeleton className="h-4 w-32" />
      <div className="space-y-3 pt-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </article>
  );
}

/** Full-screen Ask Amaka chat (mobile web). */
export function ChatPageSkeleton() {
  return (
    <div
      className="fixed inset-x-0 top-0 bottom-0 z-10 flex max-h-dvh flex-col overflow-hidden bg-surface pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] md:static md:inset-auto md:max-h-[min(78dvh,680px)] md:overflow-hidden md:rounded-2xl md:border md:border-border md:pt-0 md:pb-0"
      aria-busy="true"
      aria-label="Loading chat"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="size-8 rounded-full" />
      </div>
      <div className="flex-1 space-y-4 overflow-hidden px-4 py-5">
        <Skeleton className="h-16 w-4/5 rounded-2xl" />
        <Skeleton className="ml-auto h-12 w-3/5 rounded-2xl" />
        <Skeleton className="h-20 w-3/4 rounded-2xl" />
      </div>
      <div className="border-t border-border p-3">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

/** Auth route shell (title + elevated card). */
export function AuthPageSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <section
      className="mx-auto w-full max-w-md space-y-8 py-8 sm:py-12"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="space-y-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="rounded-2xl bg-surface-elevated p-5 sm:p-6">
        <AuthFormSkeleton fields={fields} />
      </div>
    </section>
  );
}
