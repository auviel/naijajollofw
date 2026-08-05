"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowDown, Check, Search } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { MenuPickerItem } from "@/lib/domain/menu/types";
import { formatCadFromCents } from "@/lib/utils/currency";

type CategoryOption = {
  id: string;
  name: string;
  active: boolean;
};

type ModifierSourcePickerProps = {
  id?: string;
  source: "items" | "category";
  sourceCategoryId: string;
  sourceItemIds: string[];
  categories: CategoryOption[];
  pickerItems: MenuPickerItem[];
  excludeItemId?: string;
  error?: string | null;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  onSourceChange: (source: "items" | "category") => void;
  onToggleProduct: (itemId: string) => void;
  onSelectCategory: (categoryId: string) => void;
};

type CategoryBucket = {
  id: string;
  name: string;
  items: MenuPickerItem[];
};

function groupItemsByCategory(
  items: MenuPickerItem[],
  categories: CategoryOption[],
): CategoryBucket[] {
  const buckets = categories.map((category) => ({
    id: category.id,
    name: category.active ? category.name : `${category.name} (hidden)`,
    items: [] as MenuPickerItem[],
  }));
  const indexById = new Map(buckets.map((bucket, index) => [bucket.id, index]));

  for (const item of items) {
    const index = indexById.get(item.categoryId);
    if (index === undefined) {
      continue;
    }
    buckets[index]!.items.push(item);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}

export function ModifierSourcePicker({
  id,
  source,
  sourceCategoryId,
  sourceItemIds,
  categories,
  pickerItems,
  excludeItemId,
  error,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  onSourceChange,
  onToggleProduct,
  onSelectCategory,
}: ModifierSourcePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedIds = useMemo(
    () => new Set(sourceItemIds),
    [sourceItemIds],
  );

  const availableItems = useMemo(
    () => pickerItems.filter((entry) => entry.id !== excludeItemId),
    [pickerItems, excludeItemId],
  );

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return availableItems;
    }
    return availableItems.filter(
      (entry) =>
        entry.name.toLowerCase().includes(needle) ||
        entry.categoryName.toLowerCase().includes(needle),
    );
  }, [availableItems, query]);

  const productGroups = useMemo(
    () => groupItemsByCategory(filteredItems, categories),
    [filteredItems, categories],
  );

  const filteredCategories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return categories;
    }
    return categories.filter((category) =>
      category.name.toLowerCase().includes(needle),
    );
  }, [categories, query]);

  const selectedCategory = categories.find(
    (category) => category.id === sourceCategoryId,
  );

  const summary =
    source === "category" && selectedCategory
      ? selectedCategory.active
        ? selectedCategory.name
        : `${selectedCategory.name} (hidden)`
      : sourceItemIds.length === 1
        ? (availableItems.find((entry) => entry.id === sourceItemIds[0])?.name ??
          "1 product")
        : sourceItemIds.length > 1
          ? `${sourceItemIds.length} products`
          : "Choose products or a category";

  const invalid = Boolean(error) || ariaInvalid === true;

  return (
    <div
      ref={rootRef}
      className="relative"
      data-invalid={invalid ? "true" : undefined}
    >
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-describedby={ariaDescribedBy}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-md border bg-background px-4 text-left text-base text-foreground transition-colors duration-fast",
          invalid ? "border-error" : "border-border-strong",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-foreground",
          open && "outline outline-2 outline-offset-0 outline-foreground",
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate",
            source === "category"
              ? !selectedCategory && "text-text-tertiary"
              : sourceItemIds.length === 0 && "text-text-tertiary",
          )}
        >
          {summary}
        </span>
        <ArrowDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-fast",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose modifier source"
          className="absolute top-full right-0 left-0 z-40 mt-2 overflow-hidden rounded-2xl bg-surface-elevated shadow-md"
        >
          <div className="flex gap-1 border-b border-border p-2">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-xl px-3 py-2 text-sm font-medium",
                source === "items"
                  ? "bg-accent-subtle text-foreground"
                  : "text-text-secondary hover:bg-surface hover:text-foreground",
              )}
              onClick={() => onSourceChange("items")}
            >
              Product
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-xl px-3 py-2 text-sm font-medium",
                source === "category"
                  ? "bg-accent-subtle text-foreground"
                  : "text-text-secondary hover:bg-surface hover:text-foreground",
              )}
              onClick={() => onSourceChange("category")}
            >
              Category
            </button>
          </div>

          <div className="p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-tertiary"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  source === "category" ? "Search categories" : "Search products"
                }
                className="h-10 pl-9"
                aria-label={
                  source === "category" ? "Search categories" : "Search products"
                }
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto pb-2">
            {source === "category" ? (
              filteredCategories.length === 0 ? (
                <p className="px-4 py-3 text-sm text-text-secondary">
                  No categories match.
                </p>
              ) : (
                filteredCategories.map((category) => {
                  const selected = category.id === sourceCategoryId;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm",
                        selected
                          ? "bg-accent-subtle font-medium text-foreground"
                          : "text-foreground hover:bg-surface",
                      )}
                      onClick={() => {
                        onSelectCategory(category.id);
                        setOpen(false);
                      }}
                    >
                      <span className="min-w-0 truncate">
                        {category.name}
                        {!category.active ? (
                          <span className="text-text-tertiary"> · hidden</span>
                        ) : null}
                      </span>
                      {selected ? (
                        <Check className="h-4 w-4 shrink-0" aria-hidden />
                      ) : null}
                    </button>
                  );
                })
              )
            ) : productGroups.length === 0 ? (
              <p className="px-4 py-3 text-sm text-text-secondary">
                No products match.
              </p>
            ) : (
              productGroups.map((bucket) => (
                <div key={bucket.id} className="pt-1">
                  <p className="px-4 py-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                    {bucket.name}
                  </p>
                  {bucket.items.map((entry) => {
                    const selected = selectedIds.has(entry.id);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm",
                          selected
                            ? "bg-accent-subtle font-medium text-foreground"
                            : "text-foreground hover:bg-surface",
                        )}
                        onClick={() => onToggleProduct(entry.id)}
                      >
                        <span className="min-w-0 truncate">
                          {entry.name}
                          {!entry.available ? (
                            <span className="text-text-tertiary"> · sold out</span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-text-secondary">
                          {formatCadFromCents(entry.priceCents)}
                          {selected ? (
                            <Check className="h-4 w-4 text-foreground" aria-hidden />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
