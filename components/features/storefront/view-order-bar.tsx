"use client";

type ViewOrderBarProps = {
  storeName: string;
  itemCount: number;
  onViewOrder: () => void;
};

/** Uber-style mobile “View order” pill when the cart has items. */
export function ViewOrderBar({
  storeName,
  itemCount,
  onViewOrder,
}: ViewOrderBarProps) {
  const countLabel = itemCount > 99 ? "99+" : String(itemCount);

  return (
    <button
      type="button"
      onClick={onViewOrder}
      className="grid h-[3.5rem] w-full max-w-lg grid-cols-[2rem_1fr_2rem] items-center gap-2 rounded-full bg-foreground px-4 text-left text-background shadow-[0_8px_28px_rgba(0,0,0,0.28)] transition-opacity active:opacity-90"
      aria-label={`View order, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
    >
      <span aria-hidden className="h-8 w-8" />
      <span className="min-w-0 text-center">
        <span className="block text-[11px] font-medium leading-tight text-background/80">
          View order
        </span>
        <span className="block truncate text-[15px] font-semibold leading-tight">
          {storeName}
        </span>
      </span>
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold tabular-nums"
      >
        {countLabel}
      </span>
    </button>
  );
}
