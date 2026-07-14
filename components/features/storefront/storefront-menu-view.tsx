"use client";

import { useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { MenuCatalogBrowse } from "@/components/features/storefront/menu-catalog-browse";
import { StorefrontFaq } from "@/components/features/storefront/storefront-faq";
import { StorefrontHero } from "@/components/features/storefront/storefront-hero";
import { StorefrontMarketplaceLinks } from "@/components/features/storefront/storefront-marketplace-links";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { EmptyState } from "@/components/ui/empty-state";
import { UtensilsCrossed } from "@/components/ui/icons";
import {
  countFilteredItems,
  filterCatalogByQuery,
} from "@/lib/domain/menu/search";
import type { MenuCatalog } from "@/lib/domain/menu/types";
import type { StoreOpenStatus } from "@/lib/domain/store/hours";
import type { StoreProfile } from "@/lib/domain/store/types";

type StorefrontMenuViewProps = {
  store: StoreProfile;
  catalog: MenuCatalog;
  openStatus: StoreOpenStatus;
  prepMinutes: number;
  /** SSR / share-link query from `/?q=` */
  initialQuery?: string;
};

function subscribeNoop() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

export function StorefrontMenuView({
  store,
  catalog,
  openStatus,
  prepMinutes,
  initialQuery = "",
}: StorefrontMenuViewProps) {
  const searchParams = useSearchParams();
  const { menuSearchQuery, menuSearchFocused } = useStorefrontUi();
  const urlQuery = searchParams.get("q")?.trim() ?? "";
  const isClient = useIsClient();

  // Prefer live header draft, then URL, then SSR initial (pre-hydrate only).
  const needle = (
    menuSearchQuery.trim() ||
    urlQuery ||
    (!isClient ? initialQuery.trim() : "")
  ).trim();
  const isSearching = Boolean(needle);
  const isFocused = isClient
    ? menuSearchFocused || isSearching
    : isSearching;

  return (
    <StorefrontMenuContent
      store={store}
      catalog={catalog}
      openStatus={openStatus}
      prepMinutes={prepMinutes}
      needle={needle}
      isSearching={isSearching}
      isFocused={isFocused}
    />
  );
}

/** Suspense fallback — uses SSR `initialQuery` only (no searchParams). */
export function StorefrontMenuFallback({
  store,
  catalog,
  openStatus,
  prepMinutes,
  initialQuery = "",
}: StorefrontMenuViewProps) {
  const needle = initialQuery.trim();
  return (
    <StorefrontMenuContent
      store={store}
      catalog={catalog}
      openStatus={openStatus}
      prepMinutes={prepMinutes}
      needle={needle}
      isSearching={Boolean(needle)}
      isFocused={Boolean(needle)}
    />
  );
}

function StorefrontMenuContent({
  store,
  catalog,
  openStatus,
  prepMinutes,
  needle,
  isSearching,
  isFocused,
}: {
  store: StoreProfile;
  catalog: MenuCatalog;
  openStatus: StoreOpenStatus;
  prepMinutes: number;
  needle: string;
  isSearching: boolean;
  isFocused: boolean;
}) {
  const categories = filterCatalogByQuery(catalog, needle);
  const matchCount = countFilteredItems(categories);

  const hasAnyMenuItems = catalog.categories.some(
    (category) => category.items.length > 0,
  );
  const hasOrderable = categories.some((category) =>
    category.items.some((item) => item.available),
  );
  const canOrder = hasOrderable;

  if (!hasAnyMenuItems) {
    return (
      <div className="space-y-8">
        {!isFocused ? (
          <StorefrontHero
            store={store}
            openStatus={openStatus}
            prepMinutes={prepMinutes}
          />
        ) : null}
        <EmptyState
          icon={<UtensilsCrossed className="h-6 w-6" aria-hidden />}
          title="Menu unavailable"
          description="This restaurant has not published a menu yet. Check back soon."
        />
        {!isFocused ? (
          <>
            <StorefrontFaq
              store={store}
              prepMinutes={prepMinutes}
              todayLabel={openStatus.todayLabel}
            />
            <StorefrontMarketplaceLinks />
          </>
        ) : null}
      </div>
    );
  }

  if (isFocused) {
    return (
      <div className="space-y-6">
        <div id="menu" className="scroll-mt-24">
          {isSearching && categories.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed className="h-6 w-6" aria-hidden />}
              title="No matches"
              description={`Nothing matched “${needle}”. Try another search.`}
            />
          ) : (
            <MenuCatalogBrowse
              categories={categories}
              todayLabel={openStatus.todayLabel}
              orderingEnabled={canOrder}
              scheduleLabel={
                openStatus.isOpen ? null : openStatus.nextOpenLabel
              }
              searchQuery={isSearching ? needle : undefined}
              resultCount={isSearching ? matchCount : undefined}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <StorefrontHero
        store={store}
        openStatus={openStatus}
        prepMinutes={prepMinutes}
        soldOut={!hasOrderable}
      />

      <div id="menu" className="scroll-mt-24">
        <MenuCatalogBrowse
          categories={categories}
          todayLabel={openStatus.todayLabel}
          orderingEnabled={canOrder}
          scheduleLabel={
            openStatus.isOpen ? null : openStatus.nextOpenLabel
          }
        />
      </div>

      <StorefrontFaq
        store={store}
        prepMinutes={prepMinutes}
        todayLabel={openStatus.todayLabel}
      />
      <StorefrontMarketplaceLinks />
    </div>
  );
}
