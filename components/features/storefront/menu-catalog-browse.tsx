"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { displayCategoryName } from "@/components/features/storefront/category-icon";
import { CategoryRail } from "@/components/features/storefront/category-rail";
import { ItemDetailModal } from "@/components/features/storefront/item-detail-modal";
import { ChevronLeft, ChevronRight, Plus } from "@/components/ui/icons";
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

function isFeaturedCategory(name: string) {
  return /^featured\b/i.test(name.trim());
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

        <div className="mt-6 min-w-0 flex-1 space-y-10 lg:mt-0">
          {categories.map((category) => {
            const featured = isFeaturedCategory(category.name);
            return (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="scroll-mt-32 space-y-3"
              >
                {featured ? (
                  <FeaturedCarousel
                    title={displayCategoryName(category.name)}
                    items={category.items}
                    orderingEnabled={orderingEnabled}
                    onOpenDesktop={setOpenItemId}
                  />
                ) : (
                  <>
                    <h2 className="font-display text-lg font-semibold text-foreground lg:text-xl">
                      {displayCategoryName(category.name)}
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
                  </>
                )}
              </section>
            );
          })}
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

function FeaturedCarousel({
  title,
  items,
  orderingEnabled,
  onOpenDesktop,
}: {
  title: string;
  items: MenuItemListItem[];
  orderingEnabled: boolean;
  onOpenDesktop: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: -1 | 1) {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }
    const amount = Math.min(280, node.clientWidth * 0.8);
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground lg:text-xl">
          {title}
        </h2>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-surface"
            aria-label="Previous featured items"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-surface"
            aria-label="Next featured items"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <FeaturedItemCard
            key={item.id}
            item={item}
            rank={index < 3 ? index + 1 : null}
            orderingEnabled={orderingEnabled}
            onOpenDesktop={() => onOpenDesktop(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function FeaturedItemCard({
  item,
  rank,
  orderingEnabled,
  onOpenDesktop,
}: {
  item: MenuItemListItem;
  rank: number | null;
  orderingEnabled: boolean;
  onOpenDesktop: () => void;
}) {
  const router = useRouter();
  const interactive = item.available;

  const body = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface to-border/50" />
        )}
        {rank ? (
          <span className="absolute top-2 left-2 rounded-md bg-success px-2 py-1 text-[11px] font-semibold text-white">
            #{rank} most liked
          </span>
        ) : null}
        {interactive && orderingEnabled ? (
          <span
            className="absolute right-2 bottom-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
            aria-hidden
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
        {item.name}
      </p>
      <p className="mt-0.5 text-sm text-text-secondary">
        {formatCadFromCents(item.priceCents)}
      </p>
    </>
  );

  if (!interactive) {
    return (
      <div className="w-[9.5rem] shrink-0 opacity-70 sm:w-[11rem]">{body}</div>
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
      className="w-[9.5rem] shrink-0 no-underline sm:w-[11rem]"
    >
      {body}
    </Link>
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

  const media = (
    <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-surface sm:h-[112px] sm:w-[112px]">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-surface to-border/50"
          aria-hidden
        />
      )}
      {item.available && orderingEnabled ? (
        <span
          className="absolute right-2 bottom-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
          aria-hidden
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </span>
      ) : null}
    </div>
  );

  const text = (
    <div className="min-w-0 flex-1 py-0.5 pr-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-foreground">{item.name}</p>
        {!item.available ? (
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">
            Sold out
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">
        {formatCadFromCents(item.priceCents)}
      </p>
      {item.description ? (
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-text-secondary">
          {item.description}
        </p>
      ) : null}
    </div>
  );

  if (!item.available) {
    return (
      <div className="flex gap-3 rounded-xl border border-border bg-surface-elevated/60 p-3 opacity-70">
        {text}
        {media}
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
        "flex gap-3 rounded-xl border border-border bg-background p-3 no-underline transition-colors",
        "hover:border-border-strong hover:bg-surface/40",
      )}
    >
      {text}
      {media}
    </Link>
  );
}
