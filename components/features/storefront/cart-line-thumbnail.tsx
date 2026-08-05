import { MenuItemThumb } from "@/components/features/storefront/menu-item-thumb";
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
        <MenuItemThumb
          src={line.imageUrl}
          sizes={size === "sm" ? "56px" : "(max-width: 640px) 64px, 72px"}
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
