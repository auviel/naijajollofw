"use client";

import { useMemo, useState } from "react";
import type { MenuItemDetail } from "@/lib/domain/menu/types";
import { formatCadFromCents } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { cn } from "@/lib/utils/cn";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

type ItemCustomizePanelProps = {
  item: MenuItemDetail;
  /** `page` = full mobile/detail page; `modal` = desktop dialog body */
  variant?: "page" | "modal";
  /** Shown when the store is closed — guest is scheduling for next open. */
  scheduleLabel?: string | null;
  onAdded?: () => void;
};

export function ItemCustomizePanel({
  item,
  variant = "page",
  scheduleLabel = null,
  onAdded,
}: ItemCustomizePanelProps) {
  const { error: toastError } = useToast();
  const { notifyItemAdded } = useStorefrontUi();
  const [quantity, setQuantity] = useState(1);
  const [selectedByGroup, setSelectedByGroup] = useState(() => {
    const initial = new Map<string, string[]>();
    for (const group of item.modifierGroups) {
      initial.set(group.id, []);
    }
    return initial;
  });
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedModifiers = useMemo(
    () => Array.from(selectedByGroup.values()).flat(),
    [selectedByGroup],
  );

  const unitPriceCents = useMemo(() => {
    let total = item.priceCents;
    for (const group of item.modifierGroups) {
      for (const modifier of group.modifiers) {
        if (selectedModifiers.includes(modifier.id)) {
          total += modifier.priceDeltaCents;
        }
      }
    }
    return total;
  }, [item, selectedModifiers]);

  function toggleModifier(
    groupId: string,
    modifierId: string,
    maxSelect: number,
  ) {
    setSelectedByGroup((current) => {
      const next = new Map(current);
      const existing = next.get(groupId) ?? [];
      if (existing.includes(modifierId)) {
        next.set(
          groupId,
          existing.filter((id) => id !== modifierId),
        );
        return next;
      }

      if (maxSelect === 1) {
        next.set(groupId, [modifierId]);
        return next;
      }

      if (existing.length >= maxSelect) {
        return current;
      }

      next.set(groupId, [...existing, modifierId]);
      return next;
    });
  }

  async function addToCart() {
    if (!item.available) {
      return;
    }

    setPending(true);
    setFormError(null);

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuItemId: item.id,
          quantity,
          modifierIds: selectedModifiers,
        }),
      });

      if (!response.ok) {
        const message = await readApiError(response);
        setFormError(message);
        toastError(message);
        return;
      }

      notifyItemAdded({
        name: item.name,
        imageUrl: item.imageUrl,
      });
      onAdded?.();
    } catch {
      const message = "Unable to add to cart.";
      setFormError(message);
      toastError(message);
    } finally {
      setPending(false);
    }
  }

  const isModal = variant === "modal";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        isModal ? "h-full" : "space-y-6 pb-28",
      )}
    >
      <div
        className={cn(
          "min-h-0 flex-1",
          isModal ? "overflow-y-auto px-5 pt-4 pb-4 sm:px-6" : "space-y-6",
        )}
      >
        <div className={cn(!isModal && "space-y-0")}>
          <h1
            className={cn(
              "font-semibold tracking-tight text-foreground",
              isModal
                ? "font-display text-2xl"
                : "mt-4 text-3xl font-bold",
            )}
          >
            {item.name}
          </h1>
          <p
            className={cn(
              "font-semibold text-foreground",
              isModal ? "mt-2 text-base" : "mt-3 text-lg",
            )}
          >
            {formatCadFromCents(item.priceCents)}
          </p>
          {item.description ? (
            <p
              className={cn(
                "text-text-secondary",
                isModal ? "mt-3 text-sm leading-relaxed" : "mt-2 text-base",
              )}
            >
              {item.description}
            </p>
          ) : null}
          {!item.available ? (
            <p className="mt-3 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
              This item is sold out.
            </p>
          ) : scheduleLabel ? (
            <p className="mt-3 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
              Restaurant is closed — you&apos;ll pick a time at checkout
              {scheduleLabel ? (
                <>
                  {" "}
                  (next open{" "}
                  <span className="font-medium text-foreground">
                    {scheduleLabel}
                  </span>
                  )
                </>
              ) : null}
              .
            </p>
          ) : null}
        </div>

        <div className={cn(isModal ? "mt-6 space-y-6" : "space-y-6")}>
          {item.modifierGroups.map((group) => (
            <section key={group.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {group.name}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {group.maxSelect === 1
                      ? "Choose 1"
                      : `Choose up to ${group.maxSelect}`}
                  </p>
                </div>
                {group.required ? (
                  <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-xs font-medium text-text-secondary">
                    Required
                  </span>
                ) : null}
              </div>
              <div className="divide-y divide-border rounded-lg border border-border">
                {group.modifiers.map((modifier) => {
                  const checked = (selectedByGroup.get(group.id) ?? []).includes(
                    modifier.id,
                  );
                  const disabled = !modifier.available || !item.available;

                  return (
                    <button
                      key={modifier.id}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        toggleModifier(group.id, modifier.id, group.maxSelect)
                      }
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors",
                        checked ? "bg-surface" : "bg-background hover:bg-surface/60",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-foreground">
                          {modifier.name}
                          {!modifier.available ? " (unavailable)" : ""}
                        </span>
                        {modifier.priceDeltaCents > 0 ? (
                          <span className="mt-0.5 block text-sm text-text-secondary">
                            +{formatCadFromCents(modifier.priceDeltaCents)}
                          </span>
                        ) : null}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                          checked
                            ? "border-foreground bg-foreground"
                            : "border-border-strong bg-background",
                          group.maxSelect > 1 && "rounded-md",
                        )}
                      >
                        {checked ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-background" />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {formError ? (
          <p className="mt-4 text-sm text-error" role="alert">
            {formError}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-border bg-background",
          isModal
            ? "px-5 py-4 sm:px-6"
            : "fixed inset-x-0 bottom-0 z-30 bg-background/95 p-4 backdrop-blur safe-bottom",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3",
            !isModal && "mx-auto max-w-3xl",
          )}
        >
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              className="h-12 w-11 text-lg text-foreground disabled:opacity-40"
              disabled={!item.available || quantity <= 1 || pending}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-medium tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              className="h-12 w-11 text-lg text-foreground disabled:opacity-40"
              disabled={!item.available || pending}
              onClick={() => setQuantity((value) => Math.min(99, value + 1))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <Button
            type="button"
            className="flex-1"
            disabled={!item.available || pending}
            onClick={addToCart}
          >
            {pending
              ? "Adding…"
              : scheduleLabel
                ? `Add ${quantity} · ${formatCadFromCents(unitPriceCents * quantity)}`
                : `Add ${quantity} to order · ${formatCadFromCents(unitPriceCents * quantity)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
