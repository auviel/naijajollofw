import Link from "next/link";
import { formatCadFromCents } from "@/lib/utils/currency";

type StickyCartBarProps = {
  itemCount: number;
  subtotalCents: number;
};

export function StickyCartBar({ itemCount, subtotalCents }: StickyCartBarProps) {
  if (itemCount <= 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur safe-bottom">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/cart"
          className="flex h-12 w-full items-center justify-between rounded-md bg-accent px-5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-hover"
        >
          <span>
            View cart · {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
          <span>{formatCadFromCents(subtotalCents)}</span>
        </Link>
      </div>
    </div>
  );
}
