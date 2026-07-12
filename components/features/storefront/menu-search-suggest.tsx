"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search } from "@/components/ui/icons";
import {
  buildSearchSuggestions,
  type MenuSearchIndex,
  type MenuSearchItem,
} from "@/lib/domain/menu/search";
import { formatCadFromCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

type MenuSearchSuggestProps = {
  open: boolean;
  query: string;
  searchIndex: MenuSearchIndex;
  listId?: string;
  onSelectKeyword: (keyword: string) => void;
  onSelectItem: (item: MenuSearchItem) => void;
  onSearchForQuery: (query: string) => void;
  onClose: () => void;
  className?: string;
};

type Row =
  | { kind: "item"; item: MenuSearchItem }
  | { kind: "keyword"; keyword: string }
  | { kind: "search"; query: string };

export function MenuSearchSuggest({
  open,
  query,
  searchIndex,
  listId: listIdProp,
  onSelectKeyword,
  onSelectItem,
  onSearchForQuery,
  onClose,
  className,
}: MenuSearchSuggestProps) {
  const generatedId = useId();
  const listId = listIdProp ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const trimmed = query.trim();
  const suggestions = buildSearchSuggestions(searchIndex, trimmed);
  const rows: Row[] = [];
  const resetKey = `${open}:${trimmed}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setActiveIndex(0);
  }

  if (trimmed) {
    for (const item of suggestions.items) {
      rows.push({ kind: "item", item });
    }
    for (const keyword of suggestions.keywords) {
      rows.push({ kind: "keyword", keyword });
    }
    rows.push({ kind: "search", query: trimmed });
  }

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open, onClose]);

  if (!open || !trimmed || rows.length === 0) {
    return null;
  }

  function activate(row: Row) {
    if (row.kind === "item") {
      onSelectItem(row.item);
    } else if (row.kind === "keyword") {
      onSelectKeyword(row.keyword);
    } else {
      onSearchForQuery(row.query);
    }
  }

  return (
    <div
      ref={rootRef}
      id={listId}
      role="listbox"
      aria-label="Search suggestions"
      className={cn(
        "absolute top-[calc(100%+0.5rem)] right-0 left-0 z-30 max-h-[min(28rem,70vh)] overflow-y-auto rounded-2xl border border-border bg-background shadow-[0_12px_40px_rgba(0,0,0,0.12)]",
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (event.key === "Enter") {
          event.preventDefault();
          const row = rows.at(activeIndex);
          if (row) activate(row);
        } else if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <ul className="divide-y divide-border py-1">
        {rows.map((row, index) => {
          const active = index === activeIndex;
          if (row.kind === "item") {
            return (
              <li key={`item-${row.item.id}`} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    active ? "bg-surface" : "hover:bg-surface/80",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => activate(row)}
                >
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface">
                    {row.item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.item.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 bg-gradient-to-br from-surface to-border/50" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {row.item.name}
                    </span>
                    <span className="mt-0.5 block text-sm text-text-secondary">
                      {formatCadFromCents(row.item.priceCents)}
                      {!row.item.available ? " · Sold out" : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          }

          if (row.kind === "keyword") {
            return (
              <li key={`kw-${row.keyword}`} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    active ? "bg-surface" : "hover:bg-surface/80",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => activate(row)}
                >
                  <Search
                    className="h-5 w-5 shrink-0 text-text-tertiary"
                    aria-hidden
                  />
                  <span className="text-sm text-foreground lowercase">
                    {row.keyword}
                  </span>
                </button>
              </li>
            );
          }

          return (
            <li key="search-for" role="option" aria-selected={active}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  active ? "bg-surface" : "hover:bg-surface/80",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => activate(row)}
              >
                <Search
                  className="h-5 w-5 shrink-0 text-text-tertiary"
                  aria-hidden
                />
                <span className="text-sm text-foreground">
                  Search for &lsquo;{row.query}&rsquo;
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
