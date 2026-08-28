import { Suspense } from "react";
import { StorefrontMenuView } from "@/components/features/storefront/storefront-menu-view";
import type { MenuCatalog } from "@/lib/domain/menu/types";
import type { StoreOpenStatus } from "@/lib/domain/store/hours";
import type { StoreProfile } from "@/lib/domain/store/types";
import type { PublicGoogleRating } from "@/lib/integrations/google/places/types";

type StorefrontMenuProps = {
  store: StoreProfile;
  catalog: MenuCatalog;
  openStatus: StoreOpenStatus;
  prepMinutes: number;
  googleRating?: PublicGoogleRating | null;
  searchQuery?: string;
};

/** Lightweight Suspense fallback — never SSR the full catalog twice. */
function StorefrontMenuSkeleton() {
  return (
    <div
      className="min-h-[70vh]"
      aria-busy="true"
      aria-label="Loading menu"
    />
  );
}

export function StorefrontMenu({
  store,
  catalog,
  openStatus,
  prepMinutes,
  googleRating = null,
  searchQuery = "",
}: StorefrontMenuProps) {
  const shared = {
    store,
    catalog,
    openStatus,
    prepMinutes,
    googleRating,
    initialQuery: searchQuery,
  };

  return (
    <Suspense fallback={<StorefrontMenuSkeleton />}>
      <StorefrontMenuView {...shared} />
    </Suspense>
  );
}
