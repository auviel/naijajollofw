"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getRecommendedQuote } from "@/lib/domain/delivery/compare-quotes";
import {
  getDeliveryProviderLabel,
  type DeliveryProviderId,
  type DeliveryQuote,
  type DeliveryQuoteFailure,
} from "@/lib/domain/delivery/types";
import type { StaffOrderListItem } from "@/lib/domain/order/types";
import { formatCadFromCents } from "@/lib/utils/currency";
import { DeliveryTruck, Scooter } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong.";
}

type KitchenDeliveryFulfillProps = {
  order: StaffOrderListItem;
};

export function KitchenDeliveryFulfill({ order }: KitchenDeliveryFulfillProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [mode, setMode] = useState<"choose" | "courier">("choose");
  const [pendingManual, setPendingManual] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [quotes, setQuotes] = useState<DeliveryQuote[]>([]);
  const [failures, setFailures] = useState<DeliveryQuoteFailure[]>([]);
  const [selectedProviderId, setSelectedProviderId] =
    useState<DeliveryProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fulfillOurselves() {
    setPendingManual(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}/fulfill/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        toastError(await readApiError(response));
        return;
      }
      success("Out for delivery");
      router.refresh();
    } catch {
      toastError("Unable to mark out for delivery.");
    } finally {
      setPendingManual(false);
    }
  }

  async function loadQuotes() {
    if (!order.dropoffAddress) {
      setError("Missing delivery address.");
      return;
    }
    setQuoting(true);
    setError(null);
    setQuotes([]);
    setFailures([]);
    setSelectedProviderId(null);
    try {
      const response = await fetch("/api/deliveries/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropoffAddress: order.dropoffAddress,
          dropoffName: order.customerName,
          dropoffPhone: order.customerPhone,
        }),
      });
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      const body = (await response.json()) as {
        data: {
          quotes: Array<{
            providerId: DeliveryProviderId;
            id: string;
            feeCents: number;
            currency: string;
            expiresAt: string;
            pickupDurationMinutes?: number;
            dropoffEta?: string;
          }>;
          failures: DeliveryQuoteFailure[];
        };
      };
      const revived: DeliveryQuote[] = body.data.quotes.map((quote) => ({
        providerId: quote.providerId,
        id: quote.id,
        feeCents: quote.feeCents,
        currency: quote.currency,
        expiresAt: new Date(quote.expiresAt),
        pickupDurationMinutes: quote.pickupDurationMinutes,
        dropoffEta: quote.dropoffEta ? new Date(quote.dropoffEta) : undefined,
      }));
      setQuotes(revived);
      setFailures(body.data.failures);
      setSelectedProviderId(getRecommendedQuote(revived)?.providerId ?? null);
    } catch {
      setError("Unable to fetch quotes.");
    } finally {
      setQuoting(false);
    }
  }

  async function dispatchCourier() {
    if (!selectedProviderId) {
      setError("Select a courier.");
      return;
    }
    const quote = quotes.find((row) => row.providerId === selectedProviderId);
    if (!quote) {
      setError("Selected quote expired. Refresh quotes.");
      return;
    }
    setDispatching(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}/fulfill/delivergo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: selectedProviderId,
          quoteId: quote.id,
        }),
      });
      if (!response.ok) {
        toastError(await readApiError(response));
        return;
      }
      success("Courier dispatched");
      router.refresh();
    } catch {
      toastError("Unable to dispatch courier.");
    } finally {
      setDispatching(false);
    }
  }

  if (mode === "courier") {
    return (
      <div className="space-y-2">
        {quotes.length === 0 ? (
          <button
            type="button"
            disabled={quoting}
            onClick={() => void loadQuotes()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-text-inverse disabled:opacity-50"
          >
            {quoting ? (
              "Getting quotes…"
            ) : (
              <>
                <Scooter className="h-4 w-4" aria-hidden />
                Get courier quotes
              </>
            )}
          </button>
        ) : (
          <>
            <ul className="space-y-1.5">
              {quotes.map((quote) => {
                const selected = quote.providerId === selectedProviderId;
                return (
                  <li key={quote.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedProviderId(quote.providerId)}
                      className={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm",
                        selected
                          ? "border-accent bg-accent/5 text-foreground"
                          : "border-border bg-background text-text-secondary",
                      )}
                    >
                      <span>{getDeliveryProviderLabel(quote.providerId)}</span>
                      <span className="tabular-nums font-medium text-foreground">
                        {formatCadFromCents(quote.feeCents)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {failures.length > 0 ? (
              <p className="text-xs text-text-tertiary">
                {failures.length} carrier unavailable
              </p>
            ) : null}
            <button
              type="button"
              disabled={dispatching || !selectedProviderId}
              onClick={() => void dispatchCourier()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-text-inverse disabled:opacity-50"
            >
              {dispatching ? (
                "Dispatching…"
              ) : (
                <>
                  <Scooter className="h-4 w-4" aria-hidden />
                  Send courier
                </>
              )}
            </button>
          </>
        )}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <button
          type="button"
          onClick={() => {
            setMode("choose");
            setError(null);
          }}
          className="inline-flex h-9 w-full items-center justify-center text-sm font-medium text-text-secondary hover:text-foreground"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={quoting}
        onClick={() => {
          setMode("courier");
          void loadQuotes();
        }}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-accent px-2 text-sm font-medium text-text-inverse"
      >
        <Scooter className="h-4 w-4 shrink-0" aria-hidden />
        Send courier
      </button>
      <button
        type="button"
        disabled={pendingManual}
        onClick={() => void fulfillOurselves()}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 text-sm font-medium text-foreground disabled:opacity-50"
      >
        {pendingManual ? (
          "Saving…"
        ) : (
          <>
            <DeliveryTruck className="h-4 w-4 shrink-0" aria-hidden />
            We’ll deliver
          </>
        )}
      </button>
    </div>
  );
}
