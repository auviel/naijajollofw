"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { OrderStatusBadge } from "@/components/features/orders/order-status-badge";
import { Search } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { StaffOrderListItem } from "@/lib/domain/order/types";
import type {
  StaffOrderChannel,
  StaffOrderListFilter,
} from "@/lib/domain/order/transitions";
import { formatCadFromCents } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/date";

const FILTERS: Array<{ id: StaffOrderListFilter; label: string }> = [
  { id: "active", label: "Active" },
  { id: "new", label: "New" },
  { id: "preparing", label: "In kitchen" },
  { id: "ready", label: "Ready" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All statuses" },
];

const CHANNELS: Array<{ id: StaffOrderChannel; label: string }> = [
  { id: "all", label: "All jobs" },
  { id: "kitchen", label: "Kitchen" },
  { id: "courier", label: "Courier" },
];

const filterTriggerClassName =
  "h-12 border-border bg-surface-elevated px-3 text-sm";

type OrderListFiltersProps = {
  filter: StaffOrderListFilter;
  channel: StaffOrderChannel;
  search: string;
};

export function OrderListFilters({
  filter,
  channel,
  search,
}: OrderListFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(search);
  const [prevSearch, setPrevSearch] = useState(search);

  if (search !== prevSearch) {
    setPrevSearch(search);
    setQuery(search);
  }

  const pushParams = useCallback(
    (next: { filter?: string; channel?: string; q?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.filter !== undefined) {
        if (next.filter === "active") {
          params.delete("filter");
        } else {
          params.set("filter", next.filter);
        }
      }
      if (next.channel !== undefined) {
        if (next.channel === "all") {
          params.delete("channel");
        } else {
          params.set("channel", next.channel);
        }
      }
      if (next.q !== undefined) {
        if (!next.q) {
          params.delete("q");
        } else {
          params.set("q", next.q);
        }
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === search) {
      return;
    }

    const timeout = window.setTimeout(() => {
      pushParams({ q: trimmed });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, search, pushParams]);

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-text-tertiary"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or phone"
          className="pl-11"
          aria-label="Search orders"
        />
      </div>

      <label className="sr-only" htmlFor="order-channel">
        Channel
      </label>
      <Select
        id="order-channel"
        value={channel}
        disabled={pending}
        onChange={(next) => pushParams({ channel: next as StaffOrderChannel })}
        options={CHANNELS.map((item) => ({
          value: item.id,
          label: item.label,
        }))}
        className="sm:w-36"
        triggerClassName={filterTriggerClassName}
        aria-label="Channel"
      />

      <label className="sr-only" htmlFor="order-status">
        Status
      </label>
      <Select
        id="order-status"
        value={filter}
        disabled={pending}
        onChange={(next) =>
          pushParams({ filter: next as StaffOrderListFilter })
        }
        options={FILTERS.map((item) => ({
          value: item.id,
          label: item.label,
        }))}
        className="sm:w-40"
        triggerClassName={filterTriggerClassName}
        aria-label="Status"
      />
    </div>
  );
}

type OrderListProps = {
  items: StaffOrderListItem[];
};

export function OrderList({ items }: OrderListProps) {
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-surface-elevated">
      {items.map((order) => (
        <li key={order.id}>
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-background sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="font-medium text-foreground">{order.customerName}</p>
              <p className="truncate text-sm text-text-secondary">
                {order.itemSummary} ·{" "}
                {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
              </p>
              <p className="text-xs text-text-tertiary">
                {formatDateTime(order.placedAt ?? order.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-sm">
              <OrderStatusBadge status={order.status} />
              <span className="font-medium text-foreground">
                {formatCadFromCents(order.totalCents)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
