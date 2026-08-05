"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList } from "@/components/ui/icons";
import { KitchenDeliveryFulfill } from "@/components/features/orders/kitchen-delivery-fulfill";
import { OrderTransitionButtons } from "@/components/features/orders/order-transition-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ACTIVE_DELIVERY_POLL_MS,
  useLiveRefresh,
} from "@/components/hooks/use-live-refresh";
import {
  formatKitchenScheduled,
  formatKitchenWait,
} from "@/lib/domain/order/kitchen-format";
import { isKitchenBoardDeferred } from "@/lib/domain/order/kitchen-schedule";
import type { StaffOrderListItem } from "@/lib/domain/order/types";
import {
  getTransitionActions,
  KITCHEN_BOARD_COLUMNS,
  type TransitionAction,
} from "@/lib/domain/order/transitions";
import { easeOut, listItem, motionDuration } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

const BOARD_POLL_MS = ACTIVE_DELIVERY_POLL_MS;

const TAB_LABELS: Record<(typeof KITCHEN_BOARD_COLUMNS)[number]["id"], string> =
  {
    new: "New",
    cooking: "Cooking",
    ready: "Ready",
  };

const BOARD_ACTION_LABELS: Partial<Record<TransitionAction["to"], string>> = {
  preparing: "Start",
  ready: "Ready",
  ready_for_pickup: "Ready",
};

type ColumnId = (typeof KITCHEN_BOARD_COLUMNS)[number]["id"];

type KitchenBoardProps = {
  initialItems: StaffOrderListItem[];
  initialPendingCount: number;
  prepMinutes: number;
};

type ListApiResponse = {
  data: {
    items: StaffOrderListItem[];
    pendingAcceptanceCount: number;
    prepMinutes: number;
  };
};

function orderTimeMs(order: StaffOrderListItem): number {
  const iso = order.placedAt ?? order.createdAt;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function ordersForColumn(
  items: StaffOrderListItem[],
  column: (typeof KITCHEN_BOARD_COLUMNS)[number],
): StaffOrderListItem[] {
  return items
    .filter((order) =>
      (column.statuses as readonly string[]).includes(order.status),
    )
    .sort((a, b) => orderTimeMs(b) - orderTimeMs(a));
}

function firstColumnWithWork(items: StaffOrderListItem[]): ColumnId {
  for (const column of KITCHEN_BOARD_COLUMNS) {
    if (ordersForColumn(items, column).length > 0) {
      return column.id;
    }
  }
  return "new";
}

export function KitchenBoard({
  initialItems,
  initialPendingCount,
  prepMinutes: initialPrepMinutes,
}: KitchenBoardProps) {
  const [items, setItems] = useState(initialItems);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [prepMinutes, setPrepMinutes] = useState(initialPrepMinutes);
  const [laterOpen, setLaterOpen] = useState(false);
  const [prevInitial, setPrevInitial] = useState(initialItems);
  const [activeColumnId, setActiveColumnId] = useState<ColumnId>(() =>
    firstColumnWithWork(
      initialItems.filter(
        (order) => !isKitchenBoardDeferred(order, initialPrepMinutes),
      ),
    ),
  );
  const knownPendingIds = useRef(
    new Set(
      initialItems
        .filter(
          (order) =>
            order.status === "pending_acceptance" &&
            !isKitchenBoardDeferred(order, initialPrepMinutes),
        )
        .map((order) => order.id),
    ),
  );
  const [flashNew, setFlashNew] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  if (initialItems !== prevInitial) {
    setPrevInitial(initialItems);
    setItems(initialItems);
    setPendingCount(initialPendingCount);
    setPrepMinutes(initialPrepMinutes);
  }

  const { liveItems, laterItems } = useMemo(() => {
    const later: StaffOrderListItem[] = [];
    const live: StaffOrderListItem[] = [];
    for (const order of items) {
      if (isKitchenBoardDeferred(order, prepMinutes)) {
        later.push(order);
      } else {
        live.push(order);
      }
    }
    later.sort((a, b) => {
      const aMs = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
      const bMs = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
      return aMs - bMs;
    });
    return { liveItems: live, laterItems: later };
  }, [items, prepMinutes]);

  const columnCounts = useMemo(() => {
    return Object.fromEntries(
      KITCHEN_BOARD_COLUMNS.map((column) => [
        column.id,
        ordersForColumn(liveItems, column).length,
      ]),
    ) as Record<ColumnId, number>;
  }, [liveItems]);

  if (columnCounts[activeColumnId] === 0) {
    const next = firstColumnWithWork(liveItems);
    if (next !== activeColumnId) {
      setActiveColumnId(next);
    }
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
        { cache: "no-store" },
      );
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as ListApiResponse;
      const nextItems = body.data.items;
      const nextPrep = body.data.prepMinutes ?? prepMinutes;
      const nextPending = nextItems.filter(
        (order) =>
          order.status === "pending_acceptance" &&
          !isKitchenBoardDeferred(order, nextPrep),
      );
      const newIds = nextPending.filter(
        (order) => !knownPendingIds.current.has(order.id),
      );

      if (newIds.length > 0 && knownPendingIds.current.size > 0) {
        playChime();
        setFlashNew(true);
        window.setTimeout(() => setFlashNew(false), 2500);
      }

      knownPendingIds.current = new Set(nextPending.map((order) => order.id));
      setItems(nextItems);
      setPrepMinutes(nextPrep);
      setPendingCount(body.data.pendingAcceptanceCount);
    } catch {
      // Ignore transient poll errors.
    }
  }, [playChime, prepMinutes]);

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

  if (liveItems.length === 0 && laterItems.length === 0) {
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

  const activeColumn =
    KITCHEN_BOARD_COLUMNS.find((column) => column.id === activeColumnId) ??
    KITCHEN_BOARD_COLUMNS[0];
  const activeOrders = ordersForColumn(liveItems, activeColumn);

  return (
    <div className="space-y-4">
      {flashNew ? (
        <p
          className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
          role="status"
        >
          New order received
        </p>
      ) : null}

      <div className="lg:hidden">
        <div
          role="tablist"
          aria-label="Kitchen board columns"
          className="flex gap-1 overflow-x-auto rounded-2xl bg-surface p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {KITCHEN_BOARD_COLUMNS.map((column) => {
            const count = columnCounts[column.id];
            const selected = column.id === activeColumnId;
            return (
              <button
                key={column.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveColumnId(column.id)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium",
                  selected
                    ? "bg-surface-elevated text-foreground"
                    : "text-text-secondary",
                )}
              >
                {TAB_LABELS[column.id]}
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold",
                    column.id === "new" && count > 0
                      ? "bg-amber-500 text-white"
                      : selected
                        ? "bg-surface text-text-secondary"
                        : "bg-surface-elevated text-text-tertiary",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <section className="mt-3 space-y-2" aria-label={activeColumn.title}>
          {activeOrders.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-tertiary">
              None
            </p>
          ) : (
            <AnimatePresence initial={false} mode="popLayout">
              {activeOrders.map((order) => (
                <KitchenOrderCard key={order.id} order={order} />
              ))}
            </AnimatePresence>
          )}
        </section>
      </div>

      <div className="hidden gap-3 lg:grid lg:grid-cols-3">
        {KITCHEN_BOARD_COLUMNS.map((column) => {
          const columnOrders = ordersForColumn(liveItems, column);

          return (
            <section
              key={column.id}
              className="flex min-h-[12rem] flex-col gap-3 rounded-2xl bg-surface-elevated/50 p-3"
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
                      : "bg-surface text-text-secondary",
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

      {laterItems.length > 0 ? (
        <section className="rounded-2xl bg-surface-elevated/50 p-3">
          <button
            type="button"
            onClick={() => setLaterOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={laterOpen || liveItems.length === 0}
          >
            <h2 className="text-sm font-semibold text-foreground">Later</h2>
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-surface px-1.5 text-xs font-semibold text-text-secondary">
              {laterItems.length}
            </span>
          </button>
          {laterOpen || liveItems.length === 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {laterItems.map((order) => (
                <KitchenOrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function kitchenActions(order: StaffOrderListItem): TransitionAction[] {
  return getTransitionActions(order.status, {
    fulfillmentType: order.fulfillmentType,
    fulfillmentMethod: order.fulfillmentMethod,
  })
    .filter((action) => action.to !== "cancelled")
    .slice(0, 1)
    .map((action) => ({
      ...action,
      label: BOARD_ACTION_LABELS[action.to] ?? action.label,
    }));
}

function KitchenOrderCard({ order }: { order: StaffOrderListItem }) {
  const reduce = useReducedMotion();
  const actions = kitchenActions(order);

  return (
    <motion.article
      layout
      initial={reduce ? { opacity: 0 } : listItem.initial}
      animate={reduce ? { opacity: 1 } : listItem.animate}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      transition={{ duration: motionDuration.chrome, ease: easeOut }}
      className={cn(
        "space-y-3 rounded-2xl bg-surface-elevated p-3",
        order.status === "pending_acceptance" && "ring-1 ring-amber-300",
      )}
    >
      <Link
        href={`/dashboard/orders/${order.id}`}
        className="block space-y-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-2xl font-semibold tabular-nums leading-none text-foreground">
            {order.displayNumber ?? "Order"}
          </p>
          <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-xs font-medium text-foreground">
            {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
          </span>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {order.customerName}
          </p>
        </div>

        {order.scheduledFor ? (
          <p className="text-sm font-medium text-amber-800">
            Scheduled {formatKitchenScheduled(order.scheduledFor)}
          </p>
        ) : (
          <p className="text-sm text-text-secondary">
            {formatKitchenWait(order.placedAt ?? order.createdAt)}
          </p>
        )}

        <p className="text-sm text-foreground">{order.itemSummary}</p>

        {order.notes ? (
          <p className="text-xs text-text-tertiary">Note: {order.notes}</p>
        ) : null}
      </Link>

      {order.status === "ready" &&
      order.fulfillmentType === "delivery" &&
      order.fulfillmentMethod === "unassigned" ? (
        <KitchenDeliveryFulfill order={order} />
      ) : (
        <OrderTransitionButtons
          orderId={order.id}
          actions={actions}
          fullWidth
        />
      )}
    </motion.article>
  );
}
