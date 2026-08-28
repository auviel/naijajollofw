import { Suspense } from "react";
import {
  StorefrontMenuFallback,
  StorefrontMenuView,
} from "@/components/features/storefront/storefront-menu-view";
import type { MenuCatalog } from "@/lib/domain/menu/types";
import type { StoreOpenStatus } from "@/lib/domain/store/hours";
import type { StoreProfile } from "@/lib/domain/store/types";
import type { PublicGoogleRating } from "@/lib/integrations/google/places/types";

type StorefrontMenuProps = {
  store: StoreProfile;
  catalog: MenuCatalog;
  cartItemCount: number;
  cartSubtotalCents: number;
  openStatus: StoreOpenStatus;
  prepMinutes: number;
  googleRating?: PublicGoogleRating | null;
  searchQuery?: string;
};

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
    <Suspense fallback={<StorefrontMenuFallback {...shared} />}>
      <StorefrontMenuView {...shared} />
    </Suspense>
  );
}
