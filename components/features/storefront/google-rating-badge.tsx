import { GOOGLE_MAPS_REVIEWS_URL } from "@/lib/integrations/google/places/config";
import type { PublicGoogleRating } from "@/lib/integrations/google/places/types";
import { cn } from "@/lib/utils/cn";

type GoogleRatingBadgeProps = {
  rating?: PublicGoogleRating | null;
  className?: string;
  size?: "sm" | "md";
};

function formatRating(value: number): string {
  return value.toFixed(1);
}

export function GoogleRatingBadge({
  rating,
  className,
  size = "md",
}: GoogleRatingBadgeProps) {
  const reviewsUrl = rating?.reviewsUrl ?? GOOGLE_MAPS_REVIEWS_URL;
  const isCompact = size === "sm";

  if (!rating) {
    return (
      <a
        href={reviewsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-2 text-sm font-medium text-foreground no-underline transition-colors hover:text-accent",
          className,
        )}
      >
        Read Google reviews
      </a>
    );
  }

  return (
    <a
      href={reviewsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex flex-wrap items-center gap-x-2 gap-y-1 no-underline transition-colors hover:text-accent",
        isCompact ? "text-sm" : "text-sm sm:text-[15px]",
        className,
      )}
    >
      <span className="font-semibold text-foreground">
        {formatRating(rating.rating)} on Google
      </span>
      <span aria-hidden className="text-border-strong">
        ·
      </span>
      <span className="text-text-secondary">
        {rating.reviewCount.toLocaleString("en-CA")} review
        {rating.reviewCount === 1 ? "" : "s"}
      </span>
    </a>
  );
}
