"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ACTIVE_DELIVERY_POLL_MS,
  useLiveRefresh,
} from "@/components/hooks/use-live-refresh";
import { Bell } from "@/components/ui/icons";
import {
  countUnreadStaffNotifications,
  pendingAcceptanceOrders,
  readStaffNotifLastSeenAt,
  writeStaffNotifLastSeenAt,
} from "@/lib/domain/order/staff-notifications";
import type { StaffOrderListItem } from "@/lib/domain/order/types";
import { formatCadFromCents } from "@/lib/utils/currency";

type ListApiResponse = {
  data: {
    items: StaffOrderListItem[];
    pendingAcceptanceCount: number;
  };
};

function formatAge(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function StaffNotifications() {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StaffOrderListItem[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLastSeenAt(readStaffNotifLastSeenAt());
    setHydrated(true);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/orders?filter=active&channel=kitchen&limit=80",
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const body = (await response.json()) as ListApiResponse;
      setItems(body.data.items);
    } catch {
      // Ignore transient poll errors.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useLiveRefresh({
    enabled: true,
    intervalMs: ACTIVE_DELIVERY_POLL_MS,
    onRefresh: refresh,
  });

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pending = pendingAcceptanceOrders(items);
  const unread = hydrated
    ? countUnreadStaffNotifications(pending, lastSeenAt)
    : 0;

  function toggleOpen() {
    setOpen((current) => {
      const next = !current;
      if (next) {
        const now = Date.now();
        writeStaffNotifLastSeenAt(now);
        setLastSeenAt(now);
      }
      return next;
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        onClick={toggleOpen}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[11px] font-semibold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={buttonId}
          className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),20rem)] overflow-hidden rounded-2xl border border-border bg-background shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold text-foreground">
              Notifications
            </p>
            <p className="text-xs text-text-tertiary">
              New orders needing acceptance
            </p>
          </div>

          {pending.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-text-secondary">
              You’re all caught up
            </p>
          ) : (
            <ul className="max-h-[min(24rem,60dvh)] divide-y divide-border overflow-y-auto">
              {pending.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="block px-3 py-3 no-underline transition-colors hover:bg-surface"
                    onClick={() => setOpen(false)}
                  >
                    <p className="text-sm font-medium text-foreground">
                      New order · {order.customerName}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
                      {formatCadFromCents(order.totalCents)}
                      {" · "}
                      {formatAge(order.placedAt ?? order.createdAt)}
                      {order.itemSummary ? ` · ${order.itemSummary}` : null}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border px-3 py-2">
            <Link
              href="/dashboard"
              className="block text-center text-sm font-medium text-foreground no-underline hover:underline"
              onClick={() => setOpen(false)}
            >
              View kitchen board
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
