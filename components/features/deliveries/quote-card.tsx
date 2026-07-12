"use client";

import { useEffect, useState } from "react";
import { Clock } from "@/components/ui/icons";
import type { DeliveryQuote } from "@/lib/domain/delivery/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCadFromCents } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/date";

type QuoteCardProps = {
  quote: DeliveryQuote;
};

function getRemainingSeconds(expiresAt: Date): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function QuoteCard({ quote }: QuoteCardProps) {
  const expiresAtTime = new Date(quote.expiresAt).getTime();
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(new Date(expiresAtTime)),
  );
  const [prevExpiresAtTime, setPrevExpiresAtTime] = useState(expiresAtTime);

  if (expiresAtTime !== prevExpiresAtTime) {
    setPrevExpiresAtTime(expiresAtTime);
    setRemainingSeconds(getRemainingSeconds(new Date(expiresAtTime)));
  }

  useEffect(() => {
    const expiresAt = new Date(expiresAtTime);
    const interval = window.setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(expiresAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAtTime]);

  const isExpired = remainingSeconds <= 0;

  return (
    <Card className="border-accent/30 bg-accent-subtle/30">
      <CardHeader>
        <h2 className="text-lg font-semibold text-foreground">Quote</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Review the price before you send.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Delivery fee
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {formatCadFromCents(quote.feeCents)}
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 text-sm ${isExpired ? "text-error" : "text-text-secondary"}`}
          >
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            {isExpired ? (
              <span>Quote expired — get a new one</span>
            ) : (
              <span>Valid for {formatCountdown(remainingSeconds)}</span>
            )}
          </div>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {quote.pickupDurationMinutes !== undefined ? (
            <div>
              <dt className="text-text-tertiary">Courier arrives in</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                ~{quote.pickupDurationMinutes} min
              </dd>
            </div>
          ) : null}
          {quote.dropoffEta ? (
            <div>
              <dt className="text-text-tertiary">Delivered by</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {formatDateTime(new Date(quote.dropoffEta))}
              </dd>
            </div>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}

export function isQuoteValid(quote: DeliveryQuote | null): boolean {
  if (!quote) {
    return false;
  }

  return getRemainingSeconds(new Date(quote.expiresAt)) > 0;
}
