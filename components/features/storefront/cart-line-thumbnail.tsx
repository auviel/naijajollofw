import type { CartLineView } from "@/lib/domain/cart/types";
import { cn } from "@/lib/utils/cn";

type CartLineThumbnailProps = {
  line: Pick<CartLineView, "name" | "imageUrl">;
  className?: string;
  size?: "sm" | "md";
};

export function CartLineThumbnail({
  line,
  className,
  size = "md",
}: CartLineThumbnailProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl bg-surface",
        size === "sm" ? "h-14 w-14" : "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]",
        className,
      )}
    >
      {line.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={line.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-surface to-border/50"
          aria-hidden
        />
      )}
      <span className="sr-only">{line.name}</span>
    </div>
  );
}
