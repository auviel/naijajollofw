"use client";

import { formatCadFromCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

type ViewOrderBarProps = {
  itemCount: number;
  subtotalCents: number;
  onViewOrder: () => void;
  className?: string;
};

/** Compact mobile “View order” pill when the cart has items. */
export function ViewOrderBar({
  itemCount,
  subtotalCents,
  onViewOrder,
  className,
}: ViewOrderBarProps) {
  const countLabel = itemCount > 99 ? "99+" : String(itemCount);
  const amount = formatCadFromCents(subtotalCents);

  return (
    <button
      type="button"
      onClick={onViewOrder}
      className={cn(
        "inline-flex h-14 min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-accent pl-4 pr-2 text-left text-text-inverse shadow-[0_8px_28px_rgba(204,84,0,0.35)] transition-colors hover:bg-accent-hover active:opacity-95",
        className,
      )}
      aria-label={`View order, ${itemCount} item${itemCount === 1 ? "" : "s"}, ${amount}`}
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-medium leading-tight text-text-inverse/85">
          View order
        </span>
        <span className="block truncate text-[15px] font-semibold leading-tight tabular-nums">
          {amount}
        </span>
      </span>
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/20 text-sm font-semibold tabular-nums"
      >
        {countLabel}
      </span>
    </button>
  );
}
