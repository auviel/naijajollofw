import { MenuCatalogBrowse } from "@/components/features/storefront/menu-catalog-browse";
import { StorefrontFaq } from "@/components/features/storefront/storefront-faq";
import { StorefrontHero } from "@/components/features/storefront/storefront-hero";
import { StorefrontMarketplaceLinks } from "@/components/features/storefront/storefront-marketplace-links";
import { EmptyState } from "@/components/ui/empty-state";
import { UtensilsCrossed } from "@/components/ui/icons";
import type { MenuCatalog } from "@/lib/domain/menu/types";
import type { StoreOpenStatus } from "@/lib/domain/store/hours";
import type { StoreProfile } from "@/lib/domain/store/types";

type StorefrontMenuProps = {
  store: StoreProfile;
  catalog: MenuCatalog;
  cartItemCount: number;
  cartSubtotalCents: number;
  openStatus: StoreOpenStatus;
  prepMinutes: number;
  searchQuery?: string;
};

export function StorefrontMenu({
  store,
  catalog,
  openStatus,
  prepMinutes,
  searchQuery = "",
}: StorefrontMenuProps) {
  const needle = searchQuery.trim().toLowerCase();
  const categories = catalog.categories
    .map((category) => ({
      ...category,
      items: needle
        ? category.items.filter(
            (item) =>
              item.name.toLowerCase().includes(needle) ||
              (item.description?.toLowerCase().includes(needle) ?? false),
          )
        : category.items,
    }))
    .filter((category) => category.items.length > 0);

  const hasAnyMenuItems = catalog.categories.some(
    (category) => category.items.length > 0,
  );
  const hasOrderable = categories.some((category) =>
    category.items.some((item) => item.available),
  );
  // Guests can always add available items; closed hours → schedule at checkout.
  const canOrder = hasOrderable;

  if (!hasAnyMenuItems) {
    return (
      <div className="space-y-8">
        <StorefrontHero
          store={store}
          openStatus={openStatus}
          prepMinutes={prepMinutes}
        />
        <EmptyState
          icon={<UtensilsCrossed className="h-6 w-6" aria-hidden />}
          title="Menu unavailable"
          description="This restaurant has not published a menu yet. Check back soon."
        />
        <StorefrontFaq
          store={store}
          prepMinutes={prepMinutes}
          todayLabel={openStatus.todayLabel}
        />
        <StorefrontMarketplaceLinks />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <StorefrontHero
        store={store}
        openStatus={openStatus}
        prepMinutes={prepMinutes}
        soldOut={!hasOrderable && !needle}
      />

      <div id="menu" className="scroll-mt-24">
        {needle && categories.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="h-6 w-6" aria-hidden />}
            title="No matches"
            description={`Nothing matched “${searchQuery}”. Try another search.`}
          />
        ) : (
          <MenuCatalogBrowse
            categories={categories}
            todayLabel={openStatus.todayLabel}
            orderingEnabled={canOrder}
            scheduleLabel={
              openStatus.isOpen ? null : openStatus.nextOpenLabel
            }
          />
        )}
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
