import { GoogleRatingBadge } from "@/components/features/storefront/google-rating-badge";
import type { PublicGoogleRating } from "@/lib/integrations/google/places/types";

type GoogleReviewsStripProps = {
  rating?: PublicGoogleRating | null;
};

export function GoogleReviewsStrip({ rating }: GoogleReviewsStripProps) {
  return (
    <section
      aria-labelledby="google-reviews-heading"
      className="rounded-2xl border border-border bg-surface-elevated px-5 py-5 sm:px-6 sm:py-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="google-reviews-heading"
            className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl"
          >
            Loved in Waterloo
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary sm:text-[15px]">
            See what guests say about our jollof, stews, and party trays on Google.
          </p>
        </div>
        <GoogleRatingBadge rating={rating} className="shrink-0" />
      </div>
    </section>
  );
}
