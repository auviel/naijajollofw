"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import {
  DELIVERY_LIST_FILTERS,
  type DeliveryListFilter,
} from "@/lib/domain/delivery/filters";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";

type DeliveryListFiltersProps = {
  filter: DeliveryListFilter;
  search: string;
};

export function DeliveryListFilters({ filter, search }: DeliveryListFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(search);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setQuery(search);
  }, [search]);

  function buildHref(nextFilter: DeliveryListFilter) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextFilter === "all") {
      params.delete("filter");
    } else {
      params.set("filter", nextFilter);
    }

    const value = params.toString();
    return value ? `${pathname}?${value}` : pathname;
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = query.trim();

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div
          className="flex min-w-max gap-2 border-b border-border"
          role="tablist"
          aria-label="Filter deliveries"
        >
          {DELIVERY_LIST_FILTERS.map((item) => {
            const isActive = filter === item.value;

            return (
              <Link
                key={item.value}
                href={buildHref(item.value)}
                role="tab"
                className={cn(
                  "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-text-secondary hover:text-foreground",
                )}
                aria-selected={isActive}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by customer name or reference ID"
            className="pl-11"
            aria-label="Search deliveries"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-12 w-full shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:w-auto"
        >
          Search
        </button>
      </form>
    </div>
  );
}
