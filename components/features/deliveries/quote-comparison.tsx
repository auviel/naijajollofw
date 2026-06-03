"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import {
  getRecommendedQuote,
  isRecommendedQuote,
} from "@/lib/domain/delivery/compare-quotes";
import { getQuoteAcceptWindowLabel } from "@/lib/domain/delivery/quote-display";
import {
  DELIVERY_PROVIDER_LABELS,
  type DeliveryQuote,
  type DeliveryQuoteFailure,
  type DeliveryProviderId,
} from "@/lib/domain/delivery/types";
import { Card, CardContent } from "@/components/ui/card";
import { formatCadFromCents } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/date";

type QuoteComparisonProps = {
  quotes: DeliveryQuote[];
  failures: DeliveryQuoteFailure[];
  selectedProviderId: DeliveryProviderId | null;
  onSelect: (providerId: DeliveryProviderId) => void;
};

function getRemainingSeconds(expiresAt: Date): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function QuoteOption({
  quote,
  quotes,
  selected,
  onSelect,
}: {
  quote: DeliveryQuote;
  quotes: DeliveryQuote[];
  selected: boolean;
  onSelect: () => void;
}) {
  const expiresAt = new Date(quote.expiresAt);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(expiresAt),
  );
  const recommended = isRecommendedQuote(quote, quotes);
  const isExpired = remainingSeconds <= 0;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(expiresAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return (
    <label
      className={`block cursor-pointer rounded-lg border p-4 transition-colors ${
        selected
          ? "border-accent bg-surface ring-1 ring-accent"
          : "border-border bg-surface hover:border-border-strong"
      } ${isExpired ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          name="delivery-provider"
          className="mt-1.5 h-4 w-4 shrink-0 border-border-strong"
          checked={selected}
          disabled={isExpired}
          onChange={onSelect}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-foreground">
                  {DELIVERY_PROVIDER_LABELS[quote.providerId]}
                </span>
                {recommended ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    Recommended
                  </span>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                Delivery fee
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums leading-none text-foreground">
                {formatCadFromCents(quote.feeCents)}
              </p>
            </div>
          </div>

          <div
            className={`mt-3 flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm ${
              isExpired
                ? "border-error/20 bg-error/5 text-error"
                : "border-border bg-background text-text-secondary"
            }`}
          >
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            {isExpired ? (
              <span>Quote expired — get a new quote</span>
            ) : (
              <span>
                <span className="font-medium text-foreground">
                  {formatCountdown(remainingSeconds)} left
                </span>
                <span className="text-text-tertiary"> · </span>
                {getQuoteAcceptWindowLabel(quote.providerId)}
              </span>
            )}
          </div>

          {quote.pickupDurationMinutes !== undefined || quote.dropoffEta ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 text-sm">
              {quote.pickupDurationMinutes !== undefined ? (
                <div>
                  <dt className="text-text-tertiary">Courier arrives</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    ~{quote.pickupDurationMinutes} min
                  </dd>
                </div>
              ) : null}
              {quote.dropoffEta ? (
                <div className={quote.pickupDurationMinutes !== undefined ? "text-right" : ""}>
                  <dt className="text-text-tertiary">Delivered by</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {formatDateTime(quote.dropoffEta)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </div>
    </label>
  );
}

export function QuoteComparison({
  quotes,
  failures,
  selectedProviderId,
  onSelect,
}: QuoteComparisonProps) {
  const recommended = getRecommendedQuote(quotes);

  return (
    <Card className="border-accent/30 bg-accent-subtle/30">
      <CardContent className="space-y-4 pt-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Choose a carrier</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {quotes.length > 1 && recommended
              ? `${DELIVERY_PROVIDER_LABELS[recommended.providerId]} has the lowest fee. You can pick either option.`
              : "Review the price before you send."}
          </p>
        </div>

        <div className="space-y-3">
          {quotes.map((quote) => (
            <QuoteOption
              key={quote.providerId}
              quote={quote}
              quotes={quotes}
              selected={selectedProviderId === quote.providerId}
              onSelect={() => onSelect(quote.providerId)}
            />
          ))}
        </div>

        {failures.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
            {failures.map((failure) => (
              <p key={failure.providerId} className="text-sm text-text-secondary">
                <span className="font-medium text-foreground">
                  {DELIVERY_PROVIDER_LABELS[failure.providerId]}:
                </span>{" "}
                {failure.error}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function getSelectedQuote(
  quotes: DeliveryQuote[],
  selectedProviderId: DeliveryProviderId | null,
): DeliveryQuote | null {
  if (!selectedProviderId) {
    return getRecommendedQuote(quotes);
  }

  return quotes.find((quote) => quote.providerId === selectedProviderId) ?? null;
}

export function isQuoteValid(quote: DeliveryQuote | null): boolean {
  if (!quote) {
    return false;
  }

  return getRemainingSeconds(new Date(quote.expiresAt)) > 0;
}

export function isQuoteSelectionValid(
  quotes: DeliveryQuote[],
  selectedProviderId: DeliveryProviderId | null,
): boolean {
  return isQuoteValid(getSelectedQuote(quotes, selectedProviderId));
}
