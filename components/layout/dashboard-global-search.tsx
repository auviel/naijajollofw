"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ClipboardList, Search, Users } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import type { CustomerSearchResult } from "@/lib/domain/customer/types";
import {
  ORDER_STATUS_LABELS,
  type StaffOrderListItem,
} from "@/lib/domain/order/types";
import { cn } from "@/lib/utils/cn";

type SearchHit =
  | { kind: "order"; item: StaffOrderListItem }
  | { kind: "customer"; item: CustomerSearchResult };

export function DashboardGlobalSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const [ordersRes, customersRes] = await Promise.all([
          fetch(
            `/api/orders?q=${encodeURIComponent(trimmed)}&filter=all&limit=5`,
            { signal: controller.signal },
          ),
          fetch(
            `/api/customers/search?q=${encodeURIComponent(trimmed)}&limit=5`,
            { signal: controller.signal },
          ),
        ]);

        const ordersJson = ordersRes.ok
          ? ((await ordersRes.json()) as {
              data?: { items?: StaffOrderListItem[] };
            })
          : null;
        const customersJson = customersRes.ok
          ? ((await customersRes.json()) as {
              data?: { items?: CustomerSearchResult[] };
            })
          : null;

        const next: SearchHit[] = [
          ...(ordersJson?.data?.items ?? []).map(
            (item): SearchHit => ({ kind: "order", item }),
          ),
          ...(customersJson?.data?.items ?? []).map(
            (item): SearchHit => ({ kind: "customer", item }),
          ),
        ];
        setHits(next);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setHits([]);
        }
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
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
  }, []);

  const trimmed = query.trim();
  const showPanel = open && trimmed.length >= 2;
  const orders = hits.filter((hit) => hit.kind === "order");
  const customers = hits.filter((hit) => hit.kind === "customer");

  return (
    <div ref={rootRef} className="relative w-full min-w-0 max-w-md flex-1">
      <label className="sr-only" htmlFor="dashboard-global-search">
        Search orders and customers
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-text-tertiary"
        aria-hidden
      />
      <Input
        id="dashboard-global-search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (trimmed.length >= 2) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && trimmed) {
            event.preventDefault();
            setOpen(false);
            router.push(
              `/dashboard/orders?q=${encodeURIComponent(trimmed)}&filter=all`,
            );
          }
        }}
        placeholder="Search orders or customers"
        className="h-10 border-border bg-surface-elevated pl-10 text-sm sm:h-11"
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
      />

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-40 mt-2 max-h-[min(24rem,70dvh)] overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg"
        >
          {loading && hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-secondary">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-secondary">
              No matches for “{trimmed}”
            </p>
          ) : (
            <div className="py-1">
              {orders.length > 0 ? (
                <section>
                  <p className="px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                    Orders
                  </p>
                  <ul>
                    {orders.map(({ item }) => (
                      <li key={`order-${item.id}`}>
                        <Link
                          href={`/dashboard/orders/${item.id}`}
                          role="option"
                          className="flex items-start gap-3 px-4 py-2.5 no-underline transition-colors hover:bg-surface"
                          onClick={() => {
                            setOpen(false);
                            setQuery("");
                          }}
                        >
                          <ClipboardList
                            className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary"
                            aria-hidden
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {item.customerName}
                            </span>
                            <span className="block truncate text-xs text-text-secondary">
                              {ORDER_STATUS_LABELS[item.status]} ·{" "}
                              {item.itemSummary}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {customers.length > 0 ? (
                <section className={cn(orders.length > 0 && "border-t border-border")}>
                  <p className="px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                    Customers
                  </p>
                  <ul>
                    {customers.map(({ item }) => (
                      <li key={`customer-${item.id}`}>
                        <Link
                          href={`/dashboard/customers/${item.id}`}
                          role="option"
                          className="flex items-start gap-3 px-4 py-2.5 no-underline transition-colors hover:bg-surface"
                          onClick={() => {
                            setOpen(false);
                            setQuery("");
                          }}
                        >
                          <Users
                            className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary"
                            aria-hidden
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {item.name}
                            </span>
                            <span className="block truncate text-xs text-text-secondary">
                              {item.phoneDisplay}
                              {item.addressFormatted
                                ? ` · ${item.addressFormatted}`
                                : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <div className="border-t border-border">
                <Link
                  href={`/dashboard/orders?q=${encodeURIComponent(trimmed)}&filter=all`}
                  className="block px-4 py-2.5 text-sm font-medium text-accent no-underline hover:bg-surface"
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  View all order results
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
