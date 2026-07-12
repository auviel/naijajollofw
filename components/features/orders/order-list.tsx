"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { OrderStatusBadge } from "@/components/features/orders/order-status-badge";
import type { StaffOrderListItem } from "@/lib/domain/order/types";
import type { StaffOrderListFilter } from "@/lib/domain/order/transitions";
import { formatCadFromCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

const FILTERS: Array<{ id: StaffOrderListFilter; label: string }> = [
  { id: "active", label: "Active" },
  { id: "new", label: "New" },
  { id: "preparing", label: "In kitchen" },
  { id: "ready", label: "Ready" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
];

type OrderListFiltersProps = {
  filter: StaffOrderListFilter;
  search: string;
};

export function OrderListFilters({ filter, search }: OrderListFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(search);

  const pushParams = useCallback(
    (next: { filter?: string; q?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.filter !== undefined) {
        if (next.filter === "active") {
          params.delete("filter");
        } else {
          params.set("filter", next.filter);
        }
      }
      if (next.q !== undefined) {
        if (!next.q) {
          params.delete("q");
        } else {
          params.set("q", next.q);
        }
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={pending}
            onClick={() => pushParams({ filter: item.id })}
            className={cn(
              "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
              filter === item.id
                ? "border-accent bg-accent text-text-inverse"
                : "border-border bg-surface-elevated text-text-secondary hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          pushParams({ q: query.trim() });
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or phone"
          className="h-10 flex-1 rounded-md border border-border bg-surface-elevated px-3 text-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-md border border-border px-4 text-sm font-medium"
        >
          Search
        </button>
      </form>
    </div>
  );
}

type OrderListProps = {
  items: StaffOrderListItem[];
};

export function OrderList({ items }: OrderListProps) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface-elevated">
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
