"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "@/components/features/deliveries/address-autocomplete";
import {
  AddressPreview,
  canRequestQuote,
} from "@/components/features/deliveries/address-preview";
import { isQuoteValid, QuoteCard } from "@/components/features/deliveries/quote-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  validateDeliveryFormFields,
  type DeliveryFormErrors,
} from "@/lib/domain/delivery/form-validation";
import {
  getMaxScheduledPickupAt,
  getMinScheduledPickupAt,
  toDatetimeLocalValue,
} from "@/lib/domain/delivery/schedule";
import type { DeliveryQuote, ProofOfDeliveryConfig } from "@/lib/domain/delivery/types";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";

type DeliveryFormProps = Record<string, never>;

type ScheduleMode = "asap" | "scheduled";

type QuoteApiResponse = {
  data: {
    quote: {
      id: string;
      feeCents: number;
      currency: string;
      expiresAt: string;
      pickupDurationMinutes?: number;
      dropoffEta?: string;
    };
    geocoded: GeocodedAddress;
  };
};

type CreateApiResponse = {
  data: {
    id: string;
    externalId: string;
  };
};

function parseQuote(data: QuoteApiResponse["data"]["quote"]): DeliveryQuote {
  return {
    id: data.id,
    feeCents: data.feeCents,
    currency: data.currency,
    expiresAt: new Date(data.expiresAt),
    pickupDurationMinutes: data.pickupDurationMinutes,
    dropoffEta: data.dropoffEta ? new Date(data.dropoffEta) : undefined,
  };
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

export function DeliveryForm(_props: DeliveryFormProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [dropoffName, setDropoffName] = useState("");
  const [dropoffPhone, setDropoffPhone] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("asap");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toDatetimeLocalValue(getMinScheduledPickupAt()),
  );
  const [pod, setPod] = useState<ProofOfDeliveryConfig>({
    signature: false,
    picture: false,
    pincode: true,
  });

  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [fieldErrors, setFieldErrors] = useState<DeliveryFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const scheduleBounds = useMemo(
    () => ({
      min: toDatetimeLocalValue(getMinScheduledPickupAt()),
      max: toDatetimeLocalValue(getMaxScheduledPickupAt()),
    }),
    [],
  );

  const scheduledPickupAt = useMemo(() => {
    if (scheduleMode !== "scheduled" || !scheduledAt) {
      return undefined;
    }
    return new Date(scheduledAt);
  }, [scheduleMode, scheduledAt]);

  const scheduleSummary = useMemo(() => {
    if (scheduleMode === "scheduled" && scheduledAt) {
      return new Date(scheduledAt).toLocaleString("en-CA", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }

    return "ASAP — sent when you submit";
  }, [scheduleMode, scheduledAt]);

  const showScheduleOptions = scheduleOpen || scheduleMode === "scheduled";

  const clearQuote = useCallback(() => {
    setQuote(null);
  }, []);

  useEffect(() => {
    clearQuote();
  }, [dropoffAddress, scheduleMode, scheduledAt, clearQuote]);

  useEffect(() => {
    const query = dropoffAddress.trim();
    if (query.length < 5) {
      setGeocoded(null);
      setGeocodeError(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsGeocoding(true);
      setGeocodeError(null);

      try {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          setGeocoded(null);
          setGeocodeError(await readApiError(response));
          return;
        }

        const body = (await response.json()) as { data: GeocodedAddress };
        setGeocoded(body.data);
      } catch {
        setGeocoded(null);
        setGeocodeError("Could not check address. Try again.");
      } finally {
        setIsGeocoding(false);
      }
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [dropoffAddress]);

  const dropoffReady =
    dropoffName.trim().length > 0 &&
    dropoffPhone.trim().length >= 10 &&
    canRequestQuote(geocoded);

  const canQuote = dropoffReady && !isQuoting;
  const canSend = dropoffReady && isQuoteValid(quote) && !isSubmitting;

  function runFieldValidation() {
    const errors = validateDeliveryFormFields({
      dropoffName,
      dropoffPhone,
      geocoded,
      geocodeError,
    });
    setFieldErrors(errors);
    return errors;
  }

  async function handleGetQuote() {
    setFormError(null);
    const errors = runFieldValidation();
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsQuoting(true);

    try {
      const response = await fetch("/api/deliveries/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropoffAddress: dropoffAddress.trim(),
          ...(scheduledPickupAt ? { scheduledPickupAt: scheduledPickupAt.toISOString() } : {}),
        }),
      });

      if (!response.ok) {
        setFormError(await readApiError(response));
        return;
      }

      const body = (await response.json()) as QuoteApiResponse;
      setQuote(parseQuote(body.data.quote));
      setGeocoded(body.data.geocoded);
    } catch {
      setFormError("Unable to get a quote. Please try again.");
    } finally {
      setIsQuoting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = runFieldValidation();
    if (Object.keys(errors).length > 0) {
      setFormError("Fix the highlighted fields first.");
      return;
    }

    if (!quote || !isQuoteValid(quote)) {
      setFormError("Get a quote first, then send the delivery.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          dropoffName: dropoffName.trim(),
          dropoffPhone: dropoffPhone.trim(),
          dropoffAddress: dropoffAddress.trim(),
          proofOfDelivery: pod,
          ...(scheduledPickupAt
            ? { scheduledPickupAt: scheduledPickupAt.toISOString() }
            : {}),
        }),
      });

      if (!response.ok) {
        const message = await readApiError(response);
        setFormError(message);
        toastError(message);
        return;
      }

      const body = (await response.json()) as CreateApiResponse;
      success("Delivery sent to Uber Direct.");
      router.push(`/dashboard/deliveries/${body.data.id}`);
      router.refresh();
    } catch {
      const message = "Unable to create delivery. Please try again.";
      setFormError(message);
      toastError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6" noValidate>
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-foreground">Customer</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Who is receiving the order and where should it go?
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="dropoffName" label="Customer name" error={fieldErrors.dropoffName}>
            <Input
              name="dropoffName"
              value={dropoffName}
              onChange={(event) => {
                setDropoffName(event.target.value);
                if (fieldErrors.dropoffName) {
                  setFieldErrors((current) => ({ ...current, dropoffName: undefined }));
                }
              }}
              placeholder="Jane Doe"
              autoComplete="name"
            />
          </FormField>

          <FormField
            id="dropoffPhone"
            label="Customer phone"
            error={fieldErrors.dropoffPhone}
            hint="10-digit Canadian number."
          >
            <Input
              name="dropoffPhone"
              type="tel"
              value={dropoffPhone}
              onChange={(event) => {
                setDropoffPhone(event.target.value);
                if (fieldErrors.dropoffPhone) {
                  setFieldErrors((current) => ({ ...current, dropoffPhone: undefined }));
                }
              }}
              placeholder="5195550100"
              autoComplete="tel"
            />
          </FormField>

          <FormField
            id="dropoffAddress"
            label="Delivery address"
            error={fieldErrors.dropoffAddress}
            hint="Start typing, then pick an address from the list."
          >
            <AddressAutocomplete
              name="dropoffAddress"
              value={dropoffAddress}
              onChange={(nextValue) => {
                setDropoffAddress(nextValue);
                if (fieldErrors.dropoffAddress) {
                  setFieldErrors((current) => ({ ...current, dropoffAddress: undefined }));
                }
              }}
              placeholder="123 King St W, Kitchener, ON N2G 1A1"
            />
          </FormField>

          <AddressPreview
            result={geocoded}
            isLoading={isGeocoding}
            error={geocodeError}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-foreground">Proof of delivery</h2>
          <p className="mt-1 text-sm text-text-secondary">
            How should the courier confirm the delivery?
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border-strong"
              checked={pod.pincode}
              onChange={(event) =>
                setPod((current) => ({
                  ...current,
                  pincode: event.target.checked,
                  picture: event.target.checked ? false : current.picture,
                }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-foreground">PIN code</span>
              <span className="block text-sm text-text-secondary">
                Customer gets a 4-digit code by text. They must meet the courier to share it.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border-strong"
              checked={pod.picture}
              onChange={(event) =>
                setPod((current) => ({
                  ...current,
                  picture: event.target.checked,
                  pincode: event.target.checked ? false : current.pincode,
                }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Photo</span>
              <span className="block text-sm text-text-secondary">
                Courier takes a photo at the door. Best for leave-at-door orders.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border-strong"
              checked={pod.signature}
              onChange={(event) =>
                setPod((current) => ({ ...current, signature: event.target.checked }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Signature</span>
              <span className="block text-sm text-text-secondary">
                Customer signs when they receive the order.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        {showScheduleOptions ? (
          <>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">When to pick up</h2>
              <p className="mt-1 text-sm text-text-secondary">
                When should the courier collect the order from your store?
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Pickup schedule"
              >
                <Button
                  type="button"
                  variant={scheduleMode === "asap" ? "primary" : "secondary"}
                  onClick={() => {
                    setScheduleMode("asap");
                    setScheduleOpen(false);
                  }}
                >
                  ASAP
                </Button>
                <Button
                  type="button"
                  variant={scheduleMode === "scheduled" ? "primary" : "secondary"}
                  onClick={() => {
                    setScheduleMode("scheduled");
                    setScheduleOpen(true);
                  }}
                >
                  Schedule for later
                </Button>
              </div>

              {scheduleMode === "scheduled" ? (
                <FormField
                  id="scheduledAt"
                  label="Pickup time"
                  hint="Must be at least 15 minutes from now."
                >
                  <Input
                    name="scheduledAt"
                    type="datetime-local"
                    min={scheduleBounds.min}
                    max={scheduleBounds.max}
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </FormField>
              ) : (
                <p className="text-sm text-text-secondary">
                  A courier will be sent as soon as you submit this delivery.
                </p>
              )}
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-between gap-4 py-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">When to pick up</h2>
              <p className="mt-1 text-sm text-text-secondary">{scheduleSummary}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setScheduleOpen(true)}
            >
              Change
            </Button>
          </CardContent>
        )}
      </Card>

      {quote ? <QuoteCard quote={quote} /> : null}

      {formError ? (
        <p className="text-sm text-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={!canQuote}
          onClick={handleGetQuote}
        >
          {isQuoting ? "Getting quote…" : "Get quote"}
        </Button>
        <Button type="submit" disabled={!canSend}>
          {isSubmitting ? "Sending…" : "Send delivery"}
        </Button>
      </div>
    </form>
  );
}

/** @deprecated Use DeliveryForm — kept for imports during migration. */
export function DeliveryFormPlaceholder() {
  return (
    <p className="text-sm text-text-secondary">
      Delivery form is loading…
    </p>
  );
}
