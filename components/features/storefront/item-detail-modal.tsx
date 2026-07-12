"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemCustomizePanel } from "@/components/features/storefront/item-customize-panel";
import { useBodyScrollLock } from "@/components/hooks/use-body-scroll-lock";
import { MotionModal } from "@/components/motion/primitives";
import { X } from "@/components/ui/icons";
import type { MenuItemDetail } from "@/lib/domain/menu/types";

type ItemDetailModalProps = {
  open: boolean;
  itemId: string | null;
  scheduleLabel?: string | null;
  onClose: () => void;
};

export function ItemDetailModal({
  open,
  itemId,
  scheduleLabel = null,
  onClose,
}: ItemDetailModalProps) {
  const [activeId, setActiveId] = useState<string | null>(itemId);

  if (itemId && itemId !== activeId) {
    setActiveId(itemId);
  }

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <MotionModal open={open && Boolean(activeId)} onClose={onClose} labelledBy="item-modal-title">
      {activeId ? (
        <ItemDetailModalBody
          key={activeId}
          itemId={activeId}
          scheduleLabel={scheduleLabel}
          onClose={onClose}
        />
      ) : null}
    </MotionModal>
  );
}

function ItemDetailModalBody({
  itemId,
  scheduleLabel = null,
  onClose,
}: {
  itemId: string;
  scheduleLabel?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [item, setItem] = useState<MenuItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

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

  function handleAdded() {
    onClose();
    router.refresh();
  }

  return (
    <>
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
          <p className="text-sm text-text-secondary">
            {error ?? "Item not found."}
          </p>
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
                unoptimized={item.imageUrl.startsWith("http")}
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
    </>
  );
}
