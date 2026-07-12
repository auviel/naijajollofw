"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemCustomizePanel } from "@/components/features/storefront/item-customize-panel";
import { X } from "@/components/ui/icons";
import type { MenuItemDetail } from "@/lib/domain/menu/types";

type ItemDetailModalProps = {
  itemId: string;
  scheduleLabel?: string | null;
  onClose: () => void;
};

export function ItemDetailModal({
  itemId,
  scheduleLabel = null,
  onClose,
}: ItemDetailModalProps) {
  const router = useRouter();
  const [item, setItem] = useState<MenuItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItem(null);

    void (async () => {
      try {
        const response = await fetch(`/api/storefront/menu/${itemId}`);
        const body = (await response.json().catch(() => ({}))) as {
          data?: { item: MenuItemDetail };
          error?: string;
        };
        if (!response.ok) {
          throw new Error(body.error ?? "Could not load this item.");
        }
        if (!cancelled) {
          setItem(body.data?.item ?? null);
          if (!body.data?.item) {
            setError("Could not load this item.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load this item.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  function handleAdded() {
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-modal-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[min(90dvh,880px)] w-full max-w-4xl overflow-hidden rounded-2xl bg-background shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-surface"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        {loading ? (
          <div className="flex min-h-[28rem] w-full items-center justify-center p-10 text-sm text-text-secondary">
            Loading…
          </div>
        ) : error || !item ? (
          <div className="flex min-h-[20rem] w-full flex-col items-center justify-center gap-3 p-10 text-center">
            <p className="text-sm text-text-secondary">{error ?? "Item not found."}</p>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="grid min-h-0 w-full lg:grid-cols-2">
            <div className="relative hidden min-h-[28rem] bg-surface lg:block">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 0px, 50vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-surface to-border/40" />
              )}
            </div>

            <div className="flex min-h-0 max-h-[min(90dvh,880px)] flex-col">
              <span id="item-modal-title" className="sr-only">
                {item.name}
              </span>
              <ItemCustomizePanel
                item={item}
                variant="modal"
                scheduleLabel={scheduleLabel}
                onAdded={handleAdded}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
