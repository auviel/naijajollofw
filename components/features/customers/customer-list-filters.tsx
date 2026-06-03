"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type CustomerListFiltersProps = {
  search: string;
};

export function CustomerListFilters({ search }: CustomerListFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(search);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setQuery(search);
  }, [search]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === search) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }

      startTransition(() => {
        router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, search, pathname, router, searchParams, startTransition]);

  return (
    <div className="relative mb-6 min-w-0">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search customers by name, phone, or address"
        className="pl-11"
        aria-label="Search customers"
      />
    </div>
  );
}
