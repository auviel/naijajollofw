"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CategoryRail } from "@/components/features/storefront/category-rail";
import { ItemDetailModal } from "@/components/features/storefront/item-detail-modal";
import type { MenuCategoryView, MenuItemListItem } from "@/lib/domain/menu/types";
import { formatCadFromCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

type MenuCatalogBrowseProps = {
  categories: MenuCategoryView[];
  todayLabel: string;
  orderingEnabled: boolean;
  scheduleLabel?: string | null;
};

function isDesktopViewport() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function MenuCatalogBrowse({
  categories,
  todayLabel,
  orderingEnabled,
  scheduleLabel = null,
}: MenuCatalogBrowseProps) {
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  return (
    <>
      <div className="lg:flex lg:items-start lg:gap-10 xl:gap-12">
        <CategoryRail categories={categories} todayLabel={todayLabel} />

        <div className="mt-6 min-w-0 flex-1 space-y-8 lg:mt-0">
          {categories.map((category) => (
            <section
              key={category.id}
              id={`category-${category.id}`}
              className="scroll-mt-32 space-y-3"
            >
              <h2 className="font-display text-lg font-semibold text-foreground lg:text-xl">
                {category.name}
              </h2>
              <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
                {category.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    orderingEnabled={orderingEnabled}
                    onOpenDesktop={() => setOpenItemId(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {openItemId ? (
        <ItemDetailModal
          itemId={openItemId}
          scheduleLabel={scheduleLabel}
          onClose={() => setOpenItemId(null)}
        />
      ) : null}
    </>
  );
}

function MenuItemCard({
  item,
  orderingEnabled,
  onOpenDesktop,
}: {
  item: MenuItemListItem;
  orderingEnabled: boolean;
  onOpenDesktop: () => void;
}) {
  const router = useRouter();

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

  // Always allow opening item details (browse while closed). Cart add stays gated in the panel.
  if (!item.available) {
    return (
      <div className="flex gap-3 rounded-xl border border-border bg-surface-elevated/60 px-4 py-3 opacity-70">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/item/${item.id}`}
      onClick={(event) => {
        if (isDesktopViewport()) {
          event.preventDefault();
          onOpenDesktop();
        }
      }}
      onMouseEnter={() => {
        if (isDesktopViewport()) {
          router.prefetch(`/item/${item.id}`);
        }
      }}
      className={cn(
        "flex gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3 no-underline transition-colors",
        "hover:border-border-strong hover:bg-surface",
      )}
    >
      {content}
    </Link>
  );
}
