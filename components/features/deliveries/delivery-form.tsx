"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "@/components/features/deliveries/address-autocomplete";
import { PickupDatetimePicker } from "@/components/features/deliveries/pickup-datetime-picker";
import {
  AddressPreview,
  canRequestQuote,
} from "@/components/features/deliveries/address-preview";
import { isQuoteValid, QuoteCard } from "@/components/features/deliveries/quote-card";
import { CollapsibleSettingCard } from "@/components/ui/collapsible-setting-card";
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
import { formatPodConfigSummary } from "@/lib/domain/delivery/pod";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";
import {
  SCROLL_INTO_VIEW_MARGIN_CLASS,
  scrollIntoViewSmooth,
} from "@/lib/utils/scroll-into-view";

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
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [fieldErrors, setFieldErrors] = useState<DeliveryFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [podOpen, setPodOpen] = useState(false);
  const quoteRequestRef = useRef(0);
  const pickupSectionRef = useRef<HTMLDivElement>(null);
  const wasScheduledRef = useRef(false);

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
  const podSummary = useMemo(() => formatPodConfigSummary(pod), [pod]);
  const showPodOptions = podOpen;

  useEffect(() => {
    if (scheduleMode === "scheduled" && !wasScheduledRef.current) {
      scrollIntoViewSmooth(pickupSectionRef.current);
    }

    wasScheduledRef.current = scheduleMode === "scheduled";
  }, [scheduleMode]);

  const clearQuote = useCallback(() => {
    setQuote(null);
  }, []);

  useEffect(() => {
    clearQuote();
    quoteRequestRef.current += 1;
  }, [dropoffAddress, scheduleMode, scheduledAt, clearQuote]);

  useEffect(() => {
    const query = dropoffAddress.trim();
    if (query.length < 5) {
      setGeocoded(null);
      setVerifiedAddress(null);
      setGeocodeError(null);
      return;
    }

    setVerifiedAddress(null);

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
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [dropoffAddress]);

  const addressVerified =
    verifiedAddress === dropoffAddress.trim() && canRequestQuote(geocoded);

  const requestQuote = useCallback(async () => {
    const query = dropoffAddress.trim();
    if (!query || !addressVerified) {
      return;
    }

    const requestId = ++quoteRequestRef.current;
    setIsQuoting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/deliveries/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropoffAddress: query,
          ...(scheduledPickupAt ? { scheduledPickupAt: scheduledPickupAt.toISOString() } : {}),
        }),
      });

      if (requestId !== quoteRequestRef.current) {
        return;
      }

      if (!response.ok) {
        setQuote(null);
        setFormError(await readApiError(response));
        return;
      }

      const body = (await response.json()) as QuoteApiResponse;
      setQuote(parseQuote(body.data.quote));
      setGeocoded(body.data.geocoded);
      setVerifiedAddress(query);
    } catch {
      if (requestId === quoteRequestRef.current) {
        setQuote(null);
        setFormError("Unable to get a quote. Please try again.");
      }
    } finally {
      if (requestId === quoteRequestRef.current) {
        setIsQuoting(false);
      }
    }
  }, [addressVerified, dropoffAddress, scheduledPickupAt]);

  useEffect(() => {
    if (isGeocoding || !addressVerified) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void requestQuote();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [addressVerified, isGeocoding, requestQuote, scheduledPickupAt, scheduleMode]);

  const dropoffReady =
    dropoffName.trim().length > 0 &&
    dropoffPhone.trim().length >= 10 &&
    addressVerified;

  const canSend = dropoffReady && isQuoteValid(quote) && !isSubmitting && !isQuoting;

  function runFieldValidation() {
    const errors = validateDeliveryFormFields({
      dropoffName,
      dropoffPhone,
      addressVerified,
      geocodeError,
    });
    setFieldErrors(errors);
    return errors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = runFieldValidation();
    if (Object.keys(errors).length > 0) {
      setFormError("Fix the highlighted fields first.");
      return;
    }

    if (!quote || !isQuoteValid(quote)) {
      setFormError("Waiting for a delivery quote. Check the address and try again.");
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
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl space-y-4 pb-2 sm:space-y-5 sm:pb-0" noValidate>
      <Card>
        <CardHeader className="py-4">
          <h2 className="text-base font-semibold text-foreground">Customer</h2>
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

      <CollapsibleSettingCard
        title="Proof of delivery"
        summary={podSummary}
        expanded={showPodOptions}
        onExpand={() => setPodOpen(true)}
        onCollapse={() => setPodOpen(false)}
        expandedDescription="How should the courier confirm the delivery?"
      >
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
      </CollapsibleSettingCard>

      <CollapsibleSettingCard
        title="When to pick up"
        summary={scheduleSummary}
        expanded={showScheduleOptions}
        onExpand={() => setScheduleOpen(true)}
        onCollapse={() => setScheduleOpen(false)}
        expandedDescription="When should the courier collect the order from your store?"
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pickup schedule">
          <Button
            type="button"
            variant={scheduleMode === "asap" ? "primary" : "secondary"}
            className="h-10"
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
            className="h-10"
            onClick={() => {
              setScheduleMode("scheduled");
              setScheduleOpen(true);
            }}
          >
            Schedule for later
          </Button>
        </div>

        {scheduleMode === "scheduled" ? (
          <div ref={pickupSectionRef} className={SCROLL_INTO_VIEW_MARGIN_CLASS}>
            <FormField
              id="scheduledAt"
              label="Pickup time"
              hint="Must be at least 15 minutes from now."
            >
              <PickupDatetimePicker
                name="scheduledAt"
                value={scheduledAt}
                onChange={setScheduledAt}
                min={scheduleBounds.min}
                max={scheduleBounds.max}
              />
            </FormField>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            A courier will be sent as soon as you submit this delivery.
          </p>
        )}
      </CollapsibleSettingCard>

      {isQuoting && !quote ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
          Getting quote…
        </div>
      ) : null}

      {quote ? <QuoteCard quote={quote} /> : null}

      {formError ? (
        <p className="text-sm text-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {quote && !isQuoteValid(quote) ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={!addressVerified || isQuoting}
            onClick={() => void requestQuote()}
          >
            {isQuoting ? "Getting quote…" : "Refresh quote"}
          </Button>
        ) : null}
        <Button type="submit" className="w-full sm:w-auto" disabled={!canSend}>
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
