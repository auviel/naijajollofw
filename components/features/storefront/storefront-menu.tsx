import Link from "next/link";
import { CategoryRail } from "@/components/features/storefront/category-rail";
import { StickyCartBar } from "@/components/features/storefront/sticky-cart-bar";
import { StorefrontHero } from "@/components/features/storefront/storefront-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { UtensilsCrossed } from "@/components/ui/icons";
import type { MenuCatalog, MenuItemListItem } from "@/lib/domain/menu/types";
import type { StoreOpenStatus } from "@/lib/domain/store/hours";
import type { StoreProfile } from "@/lib/domain/store/types";
import { formatCadFromCents } from "@/lib/utils/currency";

type StorefrontMenuProps = {
  store: StoreProfile;
  catalog: MenuCatalog;
  cartItemCount: number;
  cartSubtotalCents: number;
  openStatus: StoreOpenStatus;
  prepMinutes: number;
};

export function StorefrontMenu({
  store,
  catalog,
  cartItemCount,
  cartSubtotalCents,
  openStatus,
  prepMinutes,
}: StorefrontMenuProps) {
  const categories = catalog.categories.filter(
    (category) => category.items.length > 0,
  );
  const hasOrderable = categories.some((category) =>
    category.items.some((item) => item.available),
  );
  const canOrder = openStatus.isOpen && hasOrderable;

  if (categories.length === 0) {
    return (
      <div className="space-y-8 pb-24">
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
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <StorefrontHero
        store={store}
        openStatus={openStatus}
        prepMinutes={prepMinutes}
        soldOut={!hasOrderable}
      />

      <div id="menu" className="scroll-mt-24 space-y-6">
        <CategoryRail categories={categories} />

        <div className="space-y-8">
          {categories.map((category) => (
            <section
              key={category.id}
              id={`category-${category.id}`}
              className="scroll-mt-32 space-y-3"
            >
              <h2 className="font-display text-lg font-semibold text-foreground">
                {category.name}
              </h2>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    orderingEnabled={canOrder}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {canOrder ? (
        <StickyCartBar
          itemCount={cartItemCount}
          subtotalCents={cartSubtotalCents}
        />
      ) : null}
    </div>
  );
}

function MenuItemCard({
  item,
  orderingEnabled,
}: {
  item: MenuItemListItem;
  orderingEnabled: boolean;
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{item.name}</p>
          {!item.available ? (
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">
              Sold out
            </span>
          ) : null}
        </div>
        {item.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
            {item.description}
          </p>
        ) : null}
        <p className="mt-2 text-sm font-medium text-foreground">
          {formatCadFromCents(item.priceCents)}
        </p>
      </div>
    </>
  );

  if (!item.available || !orderingEnabled) {
    return (
      <div className="flex gap-3 rounded-xl border border-border bg-surface-elevated/60 px-4 py-3 opacity-70">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/item/${item.id}`}
      className="flex gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3 no-underline transition-colors hover:border-border-strong hover:bg-surface"
    >
      {content}
    </Link>
  );
}
