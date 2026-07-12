"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { MenuItemDetail } from "@/lib/domain/menu/types";
import { formatCadFromCents } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

type ItemDetailClientProps = {
  item: MenuItemDetail;
};

export function ItemDetailClient({ item }: ItemDetailClientProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const group of item.modifierGroups) {
      initial[group.id] = [];
    }
    return initial;
  });
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedModifiers = useMemo(
    () => Object.values(selectedByGroup).flat(),
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

  function toggleModifier(groupId: string, modifierId: string, maxSelect: number) {
    setSelectedByGroup((current) => {
      const existing = current[groupId] ?? [];
      if (existing.includes(modifierId)) {
        return {
          ...current,
          [groupId]: existing.filter((id) => id !== modifierId),
        };
      }

      if (maxSelect === 1) {
        return { ...current, [groupId]: [modifierId] };
      }

      if (existing.length >= maxSelect) {
        return current;
      }

      return { ...current, [groupId]: [...existing, modifierId] };
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

      success("Added to cart");
      router.push("/cart");
      router.refresh();
    } catch {
      const message = "Unable to add to cart.";
      setFormError(message);
      toastError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6 pb-28">
      <div>
        <Link
          href="/"
          className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
        >
          ← Back to menu
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">{item.name}</h1>
        {item.description ? (
          <p className="mt-2 text-base text-text-secondary">{item.description}</p>
        ) : null}
        <p className="mt-3 text-lg font-semibold text-foreground">
          {formatCadFromCents(item.priceCents)}
        </p>
        {!item.available ? (
          <p className="mt-3 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            This item is sold out.
          </p>
        ) : null}
      </div>

      {item.modifierGroups.map((group) => (
        <section key={group.id} className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{group.name}</h2>
            <p className="text-sm text-text-secondary">
              {group.required ? "Required" : "Optional"}
              {group.maxSelect > 1 ? ` · choose up to ${group.maxSelect}` : null}
            </p>
          </div>
          <div className="space-y-2">
            {group.modifiers.map((modifier) => {
              const checked = (selectedByGroup[group.id] ?? []).includes(modifier.id);
              const disabled = !modifier.available || !item.available;

              return (
                <button
                  key={modifier.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleModifier(group.id, modifier.id, group.maxSelect)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                    checked
                      ? "border-foreground bg-surface"
                      : "border-border bg-surface-elevated hover:border-border-strong",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="font-medium text-foreground">
                    {modifier.name}
                    {!modifier.available ? " (unavailable)" : ""}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {modifier.priceDeltaCents > 0
                      ? `+${formatCadFromCents(modifier.priceDeltaCents)}`
                      : "Included"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {formError ? (
        <p className="text-sm text-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur safe-bottom">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
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
            <span className="w-8 text-center text-sm font-medium tabular-nums">{quantity}</span>
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
              : `Add · ${formatCadFromCents(unitPriceCents * quantity)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
