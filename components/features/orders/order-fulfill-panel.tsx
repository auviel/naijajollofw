"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { QuoteComparison } from "@/components/features/deliveries/quote-comparison";
import { useToast } from "@/components/ui/toast";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import type {
  DeliveryProviderId,
  DeliveryQuote,
  DeliveryQuoteFailure,
} from "@/lib/domain/delivery/types";
import { cn } from "@/lib/utils/cn";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong.";
}

type OrderFulfillPanelProps = {
  order: StaffOrderDetail;
};

export function OrderFulfillPanel({ order }: OrderFulfillPanelProps) {
  if (order.status === "ready" && order.fulfillmentType === "pickup") {
    return (
      <section className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-text-secondary">
        Use <span className="font-medium text-foreground">Ready for pickup</span>{" "}
        above when the bag is ready, then <span className="font-medium text-foreground">Complete</span>{" "}
        when the customer collects it.
      </section>
    );
  }

  if (
    order.status === "ready" &&
    order.fulfillmentType === "delivery" &&
    order.fulfillmentMethod === "unassigned"
  ) {
    return <DeliveryFulfillChoices order={order} />;
  }

  if (order.linkedDelivery) {
    return (
      <section className="space-y-2 rounded-2xl border border-border bg-surface-elevated p-4">
        <h2 className="text-sm font-semibold text-foreground">deliverGO dispatch</h2>
        <p className="text-sm text-text-secondary">
          Carrier status: {order.linkedDelivery.status.replaceAll("_", " ")}
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/dashboard/deliveries/${order.linkedDelivery.id}`}
            className="font-medium text-accent hover:underline"
          >
            Open delivery
          </Link>
          {order.linkedDelivery.trackingUrl ? (
            <a
              href={order.linkedDelivery.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent hover:underline"
            >
              Tracking link
            </a>
          ) : null}
        </div>
      </section>
    );
  }

  if (order.fulfillmentMethod === "manual") {
    return (
      <section className="space-y-1 rounded-2xl border border-border bg-surface-elevated p-4">
        <h2 className="text-sm font-semibold text-foreground">Manual delivery</h2>
        <p className="text-sm text-text-secondary">
          {order.manualDeliveryNote || "Dispatched outside deliverGO."}
        </p>
        <p className="text-xs text-text-tertiary">
          Mark Complete when the customer has received the order.
        </p>
      </section>
    );
  }

  return null;
}

function DeliveryFulfillChoices({ order }: { order: StaffOrderDetail }) {
  const [mode, setMode] = useState<"choose" | "manual" | "delivergo">("choose");

  return (
    <section className="space-y-4 rounded-md border border-amber-200 bg-amber-50/40 p-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Fulfill delivery</h2>
        <p className="text-sm text-text-secondary">
          Order is ready — choose how it leaves the restaurant.
        </p>
      </div>

      {mode === "choose" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("delivergo")}
            className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-text-inverse"
          >
            Dispatch with deliverGO
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className="h-10 rounded-md border border-border bg-background px-4 text-sm font-medium"
          >
            Manual / other courier
          </button>
        </div>
      ) : null}

      {mode === "manual" ? (
        <ManualFulfillForm orderId={order.id} onBack={() => setMode("choose")} />
      ) : null}

      {mode === "delivergo" ? (
        <DelivergoFulfillForm order={order} onBack={() => setMode("choose")} />
      ) : null}
    </section>
  );
}

function ManualFulfillForm({
  orderId,
  onBack,
}: {
  orderId: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/fulfill/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (!response.ok) {
        toastError(await readApiError(response));
        return;
      }
      success("Marked out for delivery");
      router.refresh();
    } catch {
      toastError("Unable to fulfill order.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-foreground">
          Courier / note{" "}
          <span className="font-normal text-text-tertiary">(optional)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="SkipTheDishes driver, friend picking up, …"
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void submit()}
          className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-text-inverse disabled:opacity-50"
        >
          {pending ? "Saving…" : "Mark out for delivery"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="h-10 rounded-md border border-border px-4 text-sm font-medium"
        >
          Back
        </button>
      </div>
    </div>
  );
}

function DelivergoFulfillForm({
  order,
  onBack,
}: {
  order: StaffOrderDetail;
  onBack: () => void;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [quotes, setQuotes] = useState<DeliveryQuote[]>([]);
  const [failures, setFailures] = useState<DeliveryQuoteFailure[]>([]);
  const [selectedProviderId, setSelectedProviderId] =
    useState<DeliveryProviderId | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadQuotes() {
    if (!order.dropoffAddress) {
      setError("Order is missing a delivery address.");
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

      const revived: DeliveryQuote[] = body.data.quotes.map((q) => ({
        providerId: q.providerId,
        id: q.id,
        feeCents: q.feeCents,
        currency: q.currency,
        expiresAt: new Date(q.expiresAt),
        pickupDurationMinutes: q.pickupDurationMinutes,
        dropoffEta: q.dropoffEta ? new Date(q.dropoffEta) : undefined,
      }));
      setQuotes(revived);
      setFailures(body.data.failures);
      if (revived[0]) {
        setSelectedProviderId(revived[0].providerId);
      }
    } catch {
      setError("Unable to fetch quotes.");
    } finally {
      setQuoting(false);
    }
  }

  async function dispatch() {
    if (!selectedProviderId) {
      setError("Select a carrier quote first.");
      return;
    }
    const quote = quotes.find((q) => q.providerId === selectedProviderId);
    if (!quote) {
      setError("Selected quote is no longer available. Refresh quotes.");
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Delivering to {order.dropoffAddress} · {order.customerName}
      </p>

      {quotes.length === 0 ? (
        <button
          type="button"
          disabled={quoting}
          onClick={() => void loadQuotes()}
          className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-text-inverse disabled:opacity-50"
        >
          {quoting ? "Getting quotes…" : "Get courier quotes"}
        </button>
      ) : (
        <>
          <QuoteComparison
            quotes={quotes}
            failures={failures}
            selectedProviderId={selectedProviderId}
            onSelect={setSelectedProviderId}
          />
          <button
            type="button"
            disabled={dispatching || !selectedProviderId}
            onClick={() => void dispatch()}
            className={cn(
              "h-10 rounded-md bg-accent px-4 text-sm font-medium text-text-inverse disabled:opacity-50",
            )}
          >
            {dispatching ? "Dispatching…" : "Dispatch selected courier"}
          </button>
          <button
            type="button"
            disabled={quoting}
            onClick={() => void loadQuotes()}
            className="ml-2 h-10 rounded-md border border-border px-4 text-sm font-medium"
          >
            Refresh quotes
          </button>
        </>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button
        type="button"
        onClick={onBack}
        className="h-10 rounded-md border border-border px-4 text-sm font-medium"
      >
        Back
      </button>
    </div>
  );
}
