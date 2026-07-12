"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, UtensilsCrossed } from "@/components/ui/icons";
import type { MenuCatalog, MenuItemListItem } from "@/lib/domain/menu/types";
import { formatCadFromCents } from "@/lib/utils/currency";
import { EmptyState } from "@/components/ui/empty-state";
import { PrimaryLink } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

type MenuCatalogViewProps = {
  catalog: MenuCatalog;
};

export function MenuCatalogEmpty() {
  return (
    <EmptyState
      className="flex-1"
      icon={<UtensilsCrossed className="h-6 w-6" aria-hidden />}
      title="No menu yet"
      description="Add a category, then create your first item."
      action={<PrimaryLink href="/dashboard/menu/new">New item</PrimaryLink>}
    />
  );
}

export function MenuCatalogView({ catalog }: MenuCatalogViewProps) {
  if (catalog.categories.length === 0) {
    return <MenuCatalogEmpty />;
  }

  const hasItems = catalog.categories.some((category) => category.items.length > 0);
  if (!hasItems) {
    return (
      <div className="space-y-6">
        {catalog.categories.map((category) => (
          <section key={category.id} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
              {category.name}
              {!category.active ? (
                <span className="ml-2 font-normal normal-case text-text-secondary">
                  (hidden)
                </span>
              ) : null}
            </h2>
            <p className="text-sm text-text-secondary">No items in this category yet.</p>
          </section>
        ))}
        <PrimaryLink href="/dashboard/menu/new">New item</PrimaryLink>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {catalog.categories.map((category) => (
        <section key={category.id} className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
              {category.name}
              {!category.active ? (
                <span className="ml-2 font-normal normal-case text-text-secondary">
                  (hidden)
                </span>
              ) : null}
            </h2>
            <span className="text-xs text-text-tertiary">
              {category.items.length} item{category.items.length === 1 ? "" : "s"}
            </span>
          </div>

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
    <div className="flex items-stretch gap-2 rounded-lg border border-border bg-surface-elevated">
      <Link
        href={`/dashboard/menu/${item.id}`}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{item.name}</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {formatCadFromCents(item.priceCents)}
            {item.modifierGroupCount > 0
              ? ` · ${item.modifierGroupCount} modifier group${item.modifierGroupCount === 1 ? "" : "s"}`
              : null}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden />
      </Link>

      <div className="flex items-center border-l border-border px-3">
        <button
          type="button"
          disabled={pending}
          onClick={toggleAvailability}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            available
              ? "bg-success/10 text-success hover:bg-success/15"
              : "bg-surface text-text-secondary hover:bg-border",
            pending && "opacity-60",
          )}
          aria-pressed={available}
        >
          {available ? "Available" : "Sold out"}
        </button>
      </div>
    </div>
  );
}
