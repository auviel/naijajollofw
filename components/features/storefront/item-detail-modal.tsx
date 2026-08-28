"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ItemCustomizeFooter,
  ItemCustomizePanel,
  useItemCustomize,
} from "@/components/features/storefront/item-customize-panel";
import { useBodyScrollLock } from "@/components/hooks/use-body-scroll-lock";
import { MotionModal } from "@/components/motion/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "@/components/ui/icons";
import type { MenuItemDetail } from "@/lib/domain/menu/types";
import { cn } from "@/lib/utils/cn";

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
    <MotionModal
      open={open && Boolean(activeId)}
      onClose={onClose}
      labelledBy="item-modal-title"
      overlayClassName="items-end p-0 sm:items-center sm:p-4"
      panelClassName="max-h-[min(94dvh,920px)] max-w-5xl rounded-t-2xl rounded-b-none sm:rounded-2xl"
    >
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

function ItemImagePlane({
  item,
  className,
  sizes,
}: {
  item: MenuItemDetail;
  className?: string;
  sizes: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-surface", className)}>
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          className="object-cover"
          sizes={sizes}
          priority
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,var(--accent-subtle),transparent_55%),linear-gradient(160deg,var(--surface)_0%,#ebe4dc_100%)]"
        />
      )}
    </div>
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
      {loading ? (
        <ItemDetailModalSkeleton onClose={onClose} />
      ) : error || !item ? (
        <div className="relative flex min-h-[20rem] w-full flex-col items-center justify-center gap-3 p-10 text-center">
          <CloseButton onClose={onClose} className="absolute top-3 left-3" />
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
        <ItemDetailModalContent
          item={item}
          scheduleLabel={scheduleLabel}
          onClose={onClose}
          onAdded={handleAdded}
        />
      )}
    </>
  );
}

function ItemDetailModalContent({
  item,
  scheduleLabel,
  onClose,
  onAdded,
}: {
  item: MenuItemDetail;
  scheduleLabel: string | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const customize = useItemCustomize(item, { scheduleLabel, onAdded });

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
        <div className="relative hidden w-full self-stretch bg-surface-elevated pt-5 pl-5 pr-3 sm:pt-6 sm:pl-7 lg:block">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
            <ItemImagePlane
              item={item}
              className="absolute inset-0"
              sizes="(max-width: 1024px) 0px, 32rem"
            />
            <CloseButton
              onClose={onClose}
              className="absolute top-3 left-3"
            />
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-col overflow-hidden bg-surface-elevated">
          <span id="item-modal-title" className="sr-only">
            {item.name}
          </span>
          <ItemCustomizePanel
            item={item}
            variant="modal"
            scheduleLabel={scheduleLabel}
            showImageHero
            onClose={onClose}
            hideFooter
            customize={customize}
          />
        </div>
      </div>

      <ItemCustomizeFooter customize={customize} />
    </div>
  );
}

/** Content-shaped placeholder — mirrors loaded layout so the modal doesn’t jump. */
function ItemDetailModalSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
      aria-busy="true"
      aria-label="Loading item"
    >
      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
        <div className="relative hidden w-full self-stretch bg-surface-elevated pt-5 pl-5 pr-3 sm:pt-6 sm:pl-7 lg:block">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
            <Skeleton className="absolute inset-0 h-full w-full rounded-2xl" />
            <CloseButton
              onClose={onClose}
              className="absolute top-3 left-3"
            />
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-col overflow-hidden bg-surface-elevated">
          <div className="relative aspect-[4/3] w-full shrink-0 lg:hidden">
            <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            <CloseButton
              onClose={onClose}
              className="absolute top-3 left-3"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <div className="space-y-3">
              <Skeleton className="h-7 w-3/4 max-w-sm" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-5/6 max-w-sm" />
            </div>
            <div className="space-y-3 border-t border-black/5 pt-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div className="space-y-3 border-t border-black/5 pt-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-black/5 bg-surface-elevated px-5 py-3 sm:px-7">
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 min-w-0 flex-1 rounded-full" />
      </div>
    </div>
  );
}

function CloseButton({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      className={cn(
        "z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground shadow-sm ring-1 ring-black/8 transition-colors hover:bg-surface",
        className,
      )}
      aria-label="Close"
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  );
}
