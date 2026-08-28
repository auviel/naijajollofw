"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MenuItemThumb } from "@/components/features/storefront/menu-item-thumb";
import { Image as ImageIcon, Search, UtensilsCrossed } from "@/components/ui/icons";
import { filterCatalogByQuery } from "@/lib/domain/menu/search";
import type { MenuCatalog, MenuItemListItem } from "@/lib/domain/menu/types";
import { formatCadFromCents } from "@/lib/utils/currency";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PrimaryLink } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

const filterTriggerClassName =
  "h-12 border-border bg-surface-elevated px-3 text-base";

type MenuCatalogViewProps = {
  catalog: MenuCatalog;
};

export function MenuCatalogEmpty() {
  return (
    <EmptyState
      className="flex-1"
      icon={<UtensilsCrossed className="h-6 w-6" aria-hidden />}
      title="No menu yet"
      description="Use New → New category, then add your first item."
    />
  );
}

export function MenuCatalogView({ catalog }: MenuCatalogViewProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");

  const filteredCategories = useMemo(() => {
    let categories = filterCatalogByQuery(catalog, query);
    if (categoryId !== "all") {
      categories = categories.filter((category) => category.id === categoryId);
      if (categories.length === 0 && !query.trim()) {
        const selected = catalog.categories.find((c) => c.id === categoryId);
        if (selected) return [selected];
      }
    }
    return categories;
  }, [catalog, query, categoryId]);

  if (catalog.categories.length === 0) {
    return <MenuCatalogEmpty />;
  }

  const hasItems = catalog.categories.some(
    (category) => category.items.length > 0,
  );
  const trimmedQuery = query.trim();
  const filtering = trimmedQuery.length > 0 || categoryId !== "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-text-tertiary"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search menu"
            className="pl-11"
            aria-label="Search menu"
          />
        </div>
        <label className="sr-only" htmlFor="menu-category-filter">
          Category
        </label>
        <Select
          id="menu-category-filter"
          value={categoryId}
          onChange={setCategoryId}
          options={[
            { value: "all", label: "All categories" },
            ...catalog.categories.map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ]}
          className="w-[10.5rem] shrink-0 sm:w-52"
          triggerClassName={filterTriggerClassName}
          aria-label="Category"
        />
      </div>

      {!hasItems && !filtering ? (
        <div className="space-y-6">
          {catalog.categories.map((category) => (
            <section key={category.id} className="space-y-2">
              <CategoryHeading
                name={category.name}
                hidden={!category.active}
                count={0}
              />
              <p className="text-sm text-text-secondary">No items yet.</p>
            </section>
          ))}
          <PrimaryLink href="/dashboard/menu/new">New item</PrimaryLink>
        </div>
      ) : filteredCategories.length === 0 ||
        (filtering &&
          filteredCategories.every((category) => category.items.length === 0) &&
          trimmedQuery.length > 0) ? (
        <EmptyState
          icon={<Search className="h-6 w-6" aria-hidden />}
          title="No matching items"
          description={
            trimmedQuery
              ? `Nothing matched “${trimmedQuery}”. Try another search or category.`
              : "No items in this category yet."
          }
        />
      ) : (
        <div className="space-y-8">
          {filteredCategories.map((category) => (
            <section key={category.id} className="space-y-3">
              <CategoryHeading
                name={category.name}
                hidden={!category.active}
                count={category.items.length}
              />

              {category.items.length === 0 ? (
                <p className="text-sm text-text-secondary">No items yet.</p>
              ) : (
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <MenuItemRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryHeading({
  name,
  hidden,
  count,
}: {
  name: string;
  hidden: boolean;
  count: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold text-foreground">
        {name}
        {hidden ? (
          <span className="ml-2 font-normal text-text-secondary">Hidden</span>
        ) : null}
      </h2>
      <span className="text-xs tabular-nums text-text-tertiary">{count}</span>
    </div>
  );
}

function MenuItemRow({ item }: { item: MenuItemListItem }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [pending, setPending] = useState(false);
  const [available, setAvailable] = useState(item.available);

  async function toggleAvailability() {
    const next = !available;
    setPending(true);
    setAvailable(next);

    try {
      const response = await fetch(`/api/menu/items/${item.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: next }),
      });

      if (!response.ok) {
        setAvailable(!next);
        toastError(await readApiError(response));
        return;
      }

      success(next ? "Item available" : "Marked sold out");
      router.refresh();
    } catch {
      setAvailable(!next);
      toastError("Unable to update availability.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={cn(
        "flex items-stretch gap-2 rounded-2xl bg-surface-elevated",
        !available && "ring-1 ring-amber-200",
      )}
    >
      <Link
        href={`/dashboard/menu/${item.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 transition-colors hover:bg-surface sm:px-4"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface sm:h-16 sm:w-16">
          {item.imageUrl ? (
            <MenuItemThumb
              src={item.imageUrl}
              sizes="(max-width: 640px) 56px, 64px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-tertiary">
              <ImageIcon className="h-5 w-5" aria-hidden />
            </div>
          )}
          {item.imageCount > 1 ? (
            <span className="absolute right-1 bottom-1 z-10 rounded bg-background/90 px-1 text-[10px] font-semibold text-foreground">
              +{item.imageCount - 1}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{item.name}</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {formatCadFromCents(item.priceCents)}
            {item.modifierGroupCount > 0
              ? ` · ${item.modifierGroupCount} option${item.modifierGroupCount === 1 ? "" : "s"}`
              : null}
          </p>
        </div>
      </Link>

      <div className="flex items-center pr-3 sm:pr-4">
        <button
          type="button"
          disabled={pending}
          onClick={toggleAvailability}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            available
              ? "bg-surface text-text-secondary hover:bg-border"
              : "bg-amber-100 text-amber-950 hover:bg-amber-200",
            pending && "opacity-60",
          )}
          aria-pressed={available}
          aria-label={available ? "Mark sold out" : "Mark available"}
        >
          {available ? "Available" : "Sold out"}
        </button>
      </div>
    </div>
  );
}
