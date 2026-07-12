"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList } from "@/components/ui/icons";
import { OrderStatusBadge } from "@/components/features/orders/order-status-badge";
import {
  OrderDetailLink,
  OrderTransitionButtons,
} from "@/components/features/orders/order-transition-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ACTIVE_DELIVERY_POLL_MS,
  useLiveRefresh,
} from "@/components/hooks/use-live-refresh";
import type { StaffOrderListItem } from "@/lib/domain/order/types";
import {
  getTransitionActions,
  KITCHEN_BOARD_COLUMNS,
} from "@/lib/domain/order/transitions";
import { easeOut, listItem, motionDuration } from "@/lib/motion/tokens";
import { formatCadFromCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

const BOARD_POLL_MS = ACTIVE_DELIVERY_POLL_MS;

type KitchenBoardProps = {
  initialItems: StaffOrderListItem[];
  initialPendingCount: number;
};

type ListApiResponse = {
  data: {
    items: StaffOrderListItem[];
    pendingAcceptanceCount: number;
  };
};

function formatAge(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

export function KitchenBoard({
  initialItems,
  initialPendingCount,
}: KitchenBoardProps) {
  const [items, setItems] = useState(initialItems);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [prevInitial, setPrevInitial] = useState(initialItems);
  const knownPendingIds = useRef(new Set(
    initialItems
      .filter((o) => o.status === "pending_acceptance")
      .map((o) => o.id),
  ));
  const [flashNew, setFlashNew] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  if (initialItems !== prevInitial) {
    setPrevInitial(initialItems);
    setItems(initialItems);
    setPendingCount(initialPendingCount);
  }

  const playChime = useCallback(() => {
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) {
        return;
      }
      const ctx = audioCtxRef.current ?? new AudioContextCtor();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio is best-effort.
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/orders?filter=active&channel=kitchen&limit=80",
        {        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as ListApiResponse;
      const nextItems = body.data.items;
      const nextPending = nextItems.filter(
        (o) => o.status === "pending_acceptance",
      );
      const newIds = nextPending.filter(
        (o) => !knownPendingIds.current.has(o.id),
      );

      if (newIds.length > 0 && knownPendingIds.current.size > 0) {
        playChime();
        setFlashNew(true);
        window.setTimeout(() => setFlashNew(false), 2500);
      }

      knownPendingIds.current = new Set(nextPending.map((o) => o.id));
      setItems(nextItems);
      setPendingCount(body.data.pendingAcceptanceCount);
    } catch {
      // Ignore transient poll errors.
    }
  }, [playChime]);

  useLiveRefresh({
    enabled: true,
    intervalMs: BOARD_POLL_MS,
    onRefresh: refresh,
  });

  useEffect(() => {
    document.title =
      pendingCount > 0
        ? `(${pendingCount}) Kitchen · Staff`
        : "Kitchen · Staff";
    return () => {
      document.title = "Kitchen · Staff";
    };
  }, [pendingCount]);

  const hasOrders = items.length > 0;

  if (!hasOrders) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-6 w-6" aria-hidden />}
        title="No active orders"
        description="New paid orders appear here automatically. Open All orders for history."
        action={
          <Link
            href="/dashboard/orders?filter=all"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium"
          >
            View all orders
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {flashNew ? (
        <p
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
          role="status"
        >
          New order received
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KITCHEN_BOARD_COLUMNS.map((column) => {
          const columnOrders = items.filter((order) =>
            (column.statuses as readonly string[]).includes(order.status),
          );

          return (
            <section
              key={column.id}
              className="flex min-h-[12rem] flex-col gap-3 rounded-2xl border border-border bg-surface-elevated/50 p-3"
              aria-label={column.title}
            >
              <header className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {column.title}
                </h2>
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                    column.id === "new" && columnOrders.length > 0
                      ? "bg-amber-500 text-white"
                      : "bg-background text-text-secondary",
                  )}
                >
                  {columnOrders.length}
                </span>
              </header>

              <div className="flex flex-1 flex-col gap-2">
                {columnOrders.length === 0 ? (
                  <p className="py-6 text-center text-xs text-text-tertiary">
                    None
                  </p>
                ) : (
                  <AnimatePresence initial={false} mode="popLayout">
                    {columnOrders.map((order) => (
                      <KitchenOrderCard key={order.id} order={order} />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function KitchenOrderCard({ order }: { order: StaffOrderListItem }) {
  const reduce = useReducedMotion();
  const actions = getTransitionActions(order.status, {
    fulfillmentType: order.fulfillmentType,
    fulfillmentMethod: order.fulfillmentMethod,
  }).filter((a) => a.to !== "cancelled");

  return (
    <motion.article
      layout
      initial={reduce ? { opacity: 0 } : listItem.initial}
      animate={reduce ? { opacity: 1 } : listItem.animate}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      transition={{ duration: motionDuration.chrome, ease: easeOut }}
      className={cn(
        "space-y-2 rounded-2xl border border-border bg-background p-3 shadow-sm",
        order.status === "pending_acceptance" && "border-amber-300",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-semibold text-foreground">
            {order.customerName}
          </p>
          <p className="text-xs text-text-secondary">
            {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"} ·{" "}
            {formatAge(order.placedAt ?? order.createdAt)}
          </p>
          {order.scheduledFor ? (
            <p className="text-xs font-medium text-amber-800">
              Scheduled{" "}
              {new Date(order.scheduledFor).toLocaleString("en-CA", {
                weekday: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          ) : null}
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <p className="text-sm text-text-secondary">{order.itemSummary}</p>

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">
          {formatCadFromCents(order.totalCents)}
        </span>
        <OrderDetailLink orderId={order.id} />
      </div>

      {order.notes ? (
        <p className="text-xs text-text-tertiary">Note: {order.notes}</p>
      ) : null}

      {order.status === "ready" &&
      order.fulfillmentType === "delivery" &&
      order.fulfillmentMethod === "unassigned" ? (
        <Link
          href={`/dashboard/orders/${order.id}`}
          className="inline-flex h-9 items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-3 text-sm font-medium text-amber-900"
        >
          Fulfill delivery
        </Link>
      ) : (
        <OrderTransitionButtons
          orderId={order.id}
          actions={actions.slice(0, 1)}
          compact
        />
      )}
    </motion.article>
  );
}
