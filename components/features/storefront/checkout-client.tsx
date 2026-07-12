"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AddressAutocomplete } from "@/components/features/deliveries/address-autocomplete";
import {
  canRequestQuote,
} from "@/components/features/deliveries/address-preview";
import {
  SquareCardSlot,
  useSquareCardForm,
} from "@/components/features/storefront/square-card-form";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { CartView } from "@/lib/domain/cart/types";
import { computeOrderTotals } from "@/lib/domain/order/totals";
import type { StoreOpenStatus } from "@/lib/domain/store/hours";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";
import { formatCadFromCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { ShoppingBag } from "@/components/ui/icons";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

const TIP_OPTIONS = [
  { label: "No tip", cents: 0 },
  { label: "$1", cents: 100 },
  { label: "$2", cents: 200 },
  { label: "$3", cents: 300 },
  { label: "$5", cents: 500 },
] as const;

type CheckoutClientProps = {
  initialCart: CartView;
  applicationId: string | null;
  locationId: string | null;
  environment: "sandbox" | "production";
  taxRateBps: number;
  configured: boolean;
  openStatus: StoreOpenStatus;
};

export function CheckoutClient({
  initialCart,
  applicationId,
  locationId,
  environment,
  taxRateBps,
  configured,
  openStatus,
}: CheckoutClientProps) {
  const router = useRouter();
  const { error: toastError } = useToast();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">(
    "pickup",
  );
  const [tipCents, setTipCents] = useState(0);
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(null);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const totals = useMemo(
    () => computeOrderTotals(initialCart.subtotalCents, tipCents, taxRateBps),
    [initialCart.subtotalCents, tipCents, taxRateBps],
  );

  const squareSrc =
    environment === "production"
      ? "https://web.squarecdn.com/v1/square.js"
      : "https://sandbox.web.squarecdn.com/v1/square.js";

  const cardForm = useSquareCardForm({
    applicationId: applicationId ?? "",
    locationId: locationId ?? "",
    disabled:
      !configured ||
      !scriptLoaded ||
      initialCart.items.length === 0 ||
      (!openStatus.isOpen && !openStatus.nextOpenAt),
  });

  useEffect(() => {
    if (fulfillmentType !== "delivery") {
      return;
    }

    const query = address.trim();
    const timeout = window.setTimeout(async () => {
      if (query.length < 5) {
        setGeocoded(null);
        setVerifiedAddress(null);
        setGeocodeError(null);
        return;
      }

      setIsGeocoding(true);
      setGeocodeError(null);
      setVerifiedAddress(null);

      try {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          setGeocoded(null);
          setVerifiedAddress(null);
          setGeocodeError(await readApiError(response));
          return;
        }

        const body = (await response.json()) as { data: GeocodedAddress };
        setGeocoded(body.data);
        setVerifiedAddress(query);
      } catch {
        setGeocoded(null);
        setVerifiedAddress(null);
        setGeocodeError("Could not check address. Try again.");
      } finally {
        setIsGeocoding(false);
      }
    }, query.length < 5 ? 0 : 600);

    return () => window.clearTimeout(timeout);
  }, [address, fulfillmentType]);

  const addressVerified =
    fulfillmentType === "pickup" ||
    (verifiedAddress === address.trim() && canRequestQuote(geocoded));

  if (initialCart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-6 w-6" aria-hidden />}
        title="Nothing to check out"
        description="Add items from the menu first."
        action={
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-text-inverse"
          >
            Browse menu
          </Link>
        }
      />
    );
  }

  if (!openStatus.isOpen && !openStatus.nextOpenAt) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-6 w-6" aria-hidden />}
        title="Restaurant is closed"
        description={openStatus.message}
        action={
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-text-inverse"
          >
            Browse menu
          </Link>
        }
      />
    );
  }

  async function handlePay() {
    setFormError(null);

    if (!customerName.trim()) {
      setFormError("Enter your name.");
      return;
    }
    if (customerPhone.trim().length < 10) {
      setFormError("Enter a valid phone number.");
      return;
    }
    if (fulfillmentType === "delivery" && !addressVerified) {
      setFormError("Confirm a valid delivery address.");
      return;
    }
    if (!configured || !applicationId || !locationId) {
      setFormError("Payments are not configured yet.");
      return;
    }
    if (!cardForm.ready) {
      setFormError("Card form is still loading.");
      return;
    }

    setIsSubmitting(true);

    try {
      const amount = (totals.totalCents / 100).toFixed(2);
      const nameParts = customerName.trim().split(/\s+/);
      const givenName = nameParts[0] ?? customerName.trim();
      const familyName = nameParts.slice(1).join(" ") || givenName;

      const sourceId = await cardForm.tokenize({
        amount,
        currencyCode: "CAD",
        intent: "CHARGE",
        customerInitiated: true,
        sellerKeyedIn: false,
        billingContact: {
          givenName,
          familyName,
          phone: customerPhone.trim(),
        },
      });

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId,
          idempotencyKey: crypto.randomUUID(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          fulfillmentType,
          tipCents,
          notes: notes.trim() || undefined,
          dropoffAddress:
            fulfillmentType === "delivery" ? address.trim() : undefined,
          dropoffLat:
            fulfillmentType === "delivery"
              ? geocoded?.address.latitude
              : undefined,
          dropoffLng:
            fulfillmentType === "delivery"
              ? geocoded?.address.longitude
              : undefined,
        }),
      });

      if (!response.ok) {
        const message = await readApiError(response);
        setFormError(message);
        toastError(message);
        return;
      }

      const body = (await response.json()) as {
        data: { id: string; publicToken: string };
      };
      router.push(`/orders/${body.data.id}?token=${body.data.publicToken}`);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Payment failed. Try again.";
      setFormError(message);
      toastError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {configured ? (
        <Script
          src={squareSrc}
          strategy="afterInteractive"
          onLoad={() => setScriptLoaded(true)}
          onError={() =>
            setFormError("Could not load Square. Check your connection.")
          }
        />
      ) : null}

      <div className="space-y-2">
        <Link
          href="/cart"
          className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
        >
          ← Back to cart
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Checkout
        </h1>
        <p className="text-sm text-text-secondary">
          {initialCart.itemCount} item{initialCart.itemCount === 1 ? "" : "s"} ·{" "}
          {formatCadFromCents(initialCart.subtotalCents)} before tax & tip
        </p>
        {!openStatus.isOpen && openStatus.nextOpenLabel ? (
          <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            Restaurant is closed — this order will be scheduled for{" "}
            <span className="font-medium text-foreground">
              {openStatus.nextOpenLabel}
            </span>
            .
          </p>
        ) : null}
        {environment === "sandbox" && configured ? (
          <p className="text-xs text-text-tertiary">
            Square sandbox mode — use test cards from the Square docs.
          </p>
        ) : null}
      </div>

      {!configured ? (
        <div className="rounded-md border border-border bg-surface-elevated px-4 py-3 text-sm text-text-secondary">
          Square payments are not configured. Set{" "}
          <code className="text-foreground">SQUARE_ACCESS_TOKEN</code>,{" "}
          <code className="text-foreground">SQUARE_LOCATION_ID</code>, and{" "}
          <code className="text-foreground">NEXT_PUBLIC_SQUARE_APPLICATION_ID</code>{" "}
          in your environment.
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          How do you want it?
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["pickup", "Pickup"],
              ["delivery", "Delivery"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFulfillmentType(value)}
              className={cn(
                "h-11 rounded-md border text-sm font-medium transition-colors",
                fulfillmentType === value
                  ? "border-accent bg-accent text-text-inverse"
                  : "border-border bg-surface-elevated text-foreground hover:border-accent/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Contact
        </h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="checkout-name">
            Name
          </label>
          <input
            id="checkout-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            autoComplete="name"
            className="h-11 w-full rounded-md border border-border bg-surface-elevated px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="checkout-phone">
            Phone
          </label>
          <input
            id="checkout-phone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
            placeholder="(519) 555-0100"
            className="h-11 w-full rounded-md border border-border bg-surface-elevated px-3 text-sm"
          />
        </div>
        {fulfillmentType === "delivery" ? (
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Delivery address</span>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder="Start typing your address"
              verified={addressVerified && fulfillmentType === "delivery"}
              isVerifying={isGeocoding}
              verifyError={geocodeError}
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="checkout-notes">
            Notes <span className="font-normal text-text-tertiary">(optional)</span>
          </label>
          <textarea
            id="checkout-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm"
            placeholder="Allergies, gate code, …"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Tip
        </h2>
        <div className="flex flex-wrap gap-2">
          {TIP_OPTIONS.map((option) => (
            <button
              key={option.cents}
              type="button"
              onClick={() => setTipCents(option.cents)}
              className={cn(
                "h-10 rounded-md border px-3 text-sm font-medium transition-colors",
                tipCents === option.cents
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border text-text-secondary hover:border-accent/40",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Payment
        </h2>
        {configured ? (
          <SquareCardSlot containerId={cardForm.containerId} error={cardForm.error} />
        ) : null}
      </section>

      <section className="space-y-2 rounded-md border border-border bg-surface-elevated px-4 py-3 text-sm">
        <div className="flex justify-between text-text-secondary">
          <span>Subtotal</span>
          <span>{formatCadFromCents(totals.subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>Tax</span>
          <span>{formatCadFromCents(totals.taxCents)}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>Tip</span>
          <span>{formatCadFromCents(totals.tipCents)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
          <span>Total</span>
          <span>{formatCadFromCents(totals.totalCents)}</span>
        </div>
      </section>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={isSubmitting || !configured}
        className="flex h-12 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-text-inverse transition-opacity disabled:opacity-50"
      >
        {isSubmitting
          ? "Processing…"
          : `Pay ${formatCadFromCents(totals.totalCents)}`}
      </button>
    </div>
  );
}
