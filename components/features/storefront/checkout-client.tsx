"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AddressAutocomplete } from "@/components/features/deliveries/address-autocomplete";
import {
  canRequestQuote,
} from "@/components/features/deliveries/address-preview";
import { CartLineThumbnail } from "@/components/features/storefront/cart-line-thumbnail";
import { ScheduleOrderPicker } from "@/components/features/storefront/schedule-order-picker";
import {
  SquareCardSlot,
  useSquareCardForm,
} from "@/components/features/storefront/square-card-form";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { CartView } from "@/lib/domain/cart/types";
import { computeOrderTotals } from "@/lib/domain/order/totals";
import type { StoreHoursDay, StoreOpenStatus } from "@/lib/domain/store/hours";
import { formatScheduledForLabel } from "@/lib/domain/store/schedule-slots";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";
import { formatCadFromCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { ChevronRight, ShoppingBag, X } from "@/components/ui/icons";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

type CheckoutClientProps = {
  initialCart: CartView;
  applicationId: string | null;
  locationId: string | null;
  environment: "sandbox" | "production";
  taxRateBps: number;
  configured: boolean;
  simulatePayments: boolean;
  openStatus: StoreOpenStatus;
  scheduleDays: StoreHoursDay[];
  scheduleTimeZone: string;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialCustomerEmail?: string;
};

export function CheckoutClient({
  initialCart,
  applicationId,
  locationId,
  environment,
  taxRateBps,
  configured,
  simulatePayments,
  openStatus,
  scheduleDays,
  scheduleTimeZone,
  initialCustomerName = "",
  initialCustomerPhone = "",
  initialCustomerEmail = "",
}: CheckoutClientProps) {
  const router = useRouter();
  const { error: toastError } = useToast();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail);
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">(
    "pickup",
  );
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [addressUnit, setAddressUnit] = useState("");
  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(null);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);

  const mustSchedule = !openStatus.isOpen;
  const scheduleLabel = scheduledFor
    ? formatScheduledForLabel(scheduledFor, scheduleTimeZone)
    : null;

  const totals = useMemo(
    () => computeOrderTotals(initialCart.subtotalCents, 0, taxRateBps),
    [initialCart.subtotalCents, taxRateBps],
  );

  const squareSrc =
    environment === "production"
      ? "https://web.squarecdn.com/v1/square.js"
      : "https://sandbox.web.squarecdn.com/v1/square.js";

  const canCheckout = configured || simulatePayments;

  const cardForm = useSquareCardForm({
    applicationId: applicationId ?? "",
    locationId: locationId ?? "",
    disabled:
      !configured ||
      simulatePayments ||
      !scriptLoaded ||
      initialCart.items.length === 0 ||
      (mustSchedule && !scheduledFor),
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

    if (mustSchedule && !scheduledFor) {
      setFormError("Choose a time for your order.");
      setSchedulePickerOpen(true);
      return;
    }

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
    if (!canCheckout) {
      setFormError("Payments are not configured yet.");
      return;
    }

    setIsSubmitting(true);

    try {
      let sourceId: string | undefined;

      if (!simulatePayments) {
        if (!configured || !applicationId || !locationId) {
          setFormError("Payments are not configured yet.");
          return;
        }
        if (!cardForm.ready) {
          setFormError("Card form is still loading.");
          return;
        }

        const amount = (totals.totalCents / 100).toFixed(2);
        const nameParts = customerName.trim().split(/\s+/);
        const givenName = nameParts[0] ?? customerName.trim();
        const familyName = nameParts.slice(1).join(" ") || givenName;

        sourceId = await cardForm.tokenize({
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
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId,
          idempotencyKey: crypto.randomUUID(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          fulfillmentType,
          tipCents: 0,
          notes: notes.trim() || undefined,
          scheduledFor: scheduledFor ?? undefined,
          dropoffAddress:
            fulfillmentType === "delivery" ? address.trim() : undefined,
          dropoffUnit:
            fulfillmentType === "delivery"
              ? addressUnit.trim() || undefined
              : undefined,
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
      {configured && !simulatePayments ? (
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
          {formatCadFromCents(initialCart.subtotalCents)} before tax
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Your order
          </h2>
          <Link
            href="/cart"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
          >
            Edit cart
          </Link>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {initialCart.items.map((line) => (
            <button
              key={line.id}
              type="button"
              onClick={() => setOrderDetailsOpen(true)}
              className="relative shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`${line.quantity > 1 ? `${line.quantity}× ` : ""}${line.name}`}
            >
              <CartLineThumbnail line={line} size="md" className="rounded-xl" />
              {line.quantity > 1 ? (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-semibold text-background">
                  {line.quantity}
                </span>
              ) : null}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOrderDetailsOpen(true)}
            className="inline-flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border-strong bg-surface text-center text-xs font-medium text-text-secondary transition-colors hover:border-foreground hover:text-foreground sm:h-[4.5rem] sm:w-[4.5rem]"
          >
            View
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </section>

      {orderDetailsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-order-details-title"
          onClick={() => setOrderDetailsOpen(false)}
        >
          <div
            className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2
                id="checkout-order-details-title"
                className="font-display text-2xl font-semibold text-foreground"
              >
                Your order
              </h2>
              <button
                type="button"
                onClick={() => setOrderDetailsOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-surface"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {initialCart.items.map((line) => (
                <li
                  key={line.id}
                  className="flex gap-3 rounded-lg border border-border bg-surface-elevated p-3"
                >
                  <CartLineThumbnail line={line} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground">
                        {line.quantity > 1 ? `${line.quantity}× ` : null}
                        {line.name}
                      </p>
                      <p className="shrink-0 text-sm font-medium text-foreground">
                        {formatCadFromCents(line.lineTotalCents)}
                      </p>
                    </div>
                    {line.modifiers.length > 0 ? (
                      <p className="mt-1 text-sm text-text-secondary">
                        {line.modifiers
                          .map((modifier) => modifier.name)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-5 py-4">
              <Link
                href="/cart"
                className="flex h-11 w-full items-center justify-center rounded-md border border-border text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                Edit cart
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {!configured && !simulatePayments ? (
        <div className="rounded-md border border-border bg-surface-elevated px-4 py-3 text-sm text-text-secondary">
          Square payments is not set up.
        </div>
      ) : null}

      {simulatePayments ? (
        <div className="rounded-md border border-border bg-surface-elevated px-4 py-3 text-sm text-text-secondary">
          Test checkout — orders are created without charging a card.
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          When
        </h2>
        {mustSchedule ? (
          <button
            type="button"
            onClick={() => setSchedulePickerOpen(true)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors",
              scheduledFor
                ? "border-border bg-surface-elevated hover:border-border-strong"
                : "border-foreground bg-background",
            )}
          >
            <span>
              <span className="block text-sm font-semibold text-foreground">
                {scheduleLabel
                  ? `Scheduled · ${scheduleLabel}`
                  : fulfillmentType === "delivery"
                    ? "Schedule delivery"
                    : "Schedule pickup"}
              </span>
              <span className="mt-0.5 block text-sm text-text-secondary">
                {scheduleLabel
                  ? "Tap to change"
                  : "Restaurant is closed — pick a time"}
              </span>
            </span>
            <span className="text-sm font-medium text-foreground">
              {scheduleLabel ? "Edit" : "Choose"}
            </span>
          </button>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setScheduledFor(null)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left",
                !scheduledFor
                  ? "border-foreground bg-background"
                  : "border-border bg-surface-elevated",
              )}
            >
              <span className="text-sm font-semibold text-foreground">
                Standard · ASAP
              </span>
              <span
                aria-hidden
                className={cn(
                  "flex h-5 w-5 rounded-full border-2",
                  !scheduledFor
                    ? "border-foreground bg-foreground"
                    : "border-border-strong",
                )}
              />
            </button>
            <button
              type="button"
              onClick={() => setSchedulePickerOpen(true)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left",
                scheduledFor
                  ? "border-foreground bg-background"
                  : "border-border bg-surface-elevated",
              )}
            >
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {scheduleLabel
                    ? `Scheduled · ${scheduleLabel}`
                    : fulfillmentType === "delivery"
                      ? "Schedule delivery"
                      : "Schedule pickup"}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "flex h-5 w-5 rounded-full border-2",
                  scheduledFor
                    ? "border-foreground bg-foreground"
                    : "border-border-strong",
                )}
              />
            </button>
          </div>
        )}
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
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="checkout-email">
            Email{" "}
            <span className="font-normal text-text-tertiary">(optional)</span>
          </label>
          <input
            id="checkout-email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 w-full rounded-md border border-border bg-surface-elevated px-3 text-sm"
          />
        </div>
        {fulfillmentType === "delivery" ? (
          <>
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="checkout-unit">
                Apt/Unit number{" "}
                <span className="font-normal text-text-tertiary">(optional)</span>
              </label>
              <input
                id="checkout-unit"
                type="text"
                value={addressUnit}
                onChange={(e) => setAddressUnit(e.target.value)}
                autoComplete="address-line2"
                maxLength={40}
                placeholder="e.g. Apt 4, Unit 12"
                className="h-11 w-full rounded-md border border-border bg-surface-elevated px-3 text-sm"
              />
            </div>
          </>
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
          Payment
        </h2>
        {simulatePayments ? (
          <p className="text-sm text-text-secondary">
            No card required in test mode.
          </p>
        ) : configured ? (
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
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
          <span>Total</span>
          <span>{formatCadFromCents(totals.totalCents)}</span>
        </div>
      </section>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={
          isSubmitting || !canCheckout || (mustSchedule && !scheduledFor)
        }
        className="flex h-12 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-text-inverse transition-opacity disabled:opacity-50"
      >
        {isSubmitting
          ? simulatePayments
            ? "Placing order…"
            : "Processing…"
          : mustSchedule && !scheduledFor
            ? "Choose a time to continue"
            : simulatePayments
              ? `Place order (test) · ${formatCadFromCents(totals.totalCents)}`
              : `Pay ${formatCadFromCents(totals.totalCents)}`}
      </button>
      <p className="text-center text-xs text-text-tertiary">
        {simulatePayments
          ? "Test mode — no charge"
          : "Payments secured by Square"}
      </p>

      <ScheduleOrderPicker
        open={schedulePickerOpen}
        onClose={() => setSchedulePickerOpen(false)}
        onConfirm={(iso) => {
          setScheduledFor(iso);
          setSchedulePickerOpen(false);
          setFormError(null);
        }}
        fulfillmentType={fulfillmentType}
        days={scheduleDays}
        timeZone={scheduleTimeZone}
        initialScheduledFor={scheduledFor}
      />
    </div>
  );
}
