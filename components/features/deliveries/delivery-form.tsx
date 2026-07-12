"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddressAutocomplete } from "@/components/features/deliveries/address-autocomplete";
import {
  CustomerNameAutocomplete,
  customerSearchResultToFormValues,
} from "@/components/features/customers/customer-autocomplete";
import { PickupDatetimePicker } from "@/components/features/deliveries/pickup-datetime-picker";
import {
  canRequestQuote,
} from "@/components/features/deliveries/address-preview";
import {
  getSelectedQuote,
  isQuoteSelectionValid,
  QuoteComparison,
} from "@/components/features/deliveries/quote-comparison";
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
import {
  getDeliveryProviderLabel,
  type DeliveryProviderId,
  type DeliveryQuote,
  type DeliveryQuoteFailure,
  type ProofOfDeliveryConfig,
} from "@/lib/domain/delivery/types";
import { formatPodConfigSummary } from "@/lib/domain/delivery/pod";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";
import type { CustomerDetail } from "@/lib/domain/customer/types";
import { phoneE164ToFormValue } from "@/lib/domain/customer/format";
import {
  SCROLL_INTO_VIEW_MARGIN_CLASS,
  scrollIntoViewSmooth,
} from "@/lib/utils/scroll-into-view";

type ScheduleMode = "asap" | "scheduled";

type QuoteApiResponse = {
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
    geocoded: GeocodedAddress;
  };
};

type CreateApiResponse = {
  data: {
    id: string;
    externalId: string;
  };
};

function parseQuote(data: QuoteApiResponse["data"]["quotes"][number]): DeliveryQuote {
  return {
    providerId: data.providerId,
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

export function DeliveryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const [quotes, setQuotes] = useState<DeliveryQuote[]>([]);
  const [quoteFailures, setQuoteFailures] = useState<DeliveryQuoteFailure[]>([]);
  const [selectedProviderId, setSelectedProviderId] =
    useState<DeliveryProviderId | null>(null);
  const [fieldErrors, setFieldErrors] = useState<DeliveryFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [podOpen, setPodOpen] = useState(false);
  const quoteRequestRef = useRef(0);
  const pickupSectionRef = useRef<HTMLDivElement>(null);
  const wasScheduledRef = useRef(false);
  const prefilledCustomerRef = useRef<string | null>(null);

  useEffect(() => {
    const customerId = searchParams.get("customerId");
    if (!customerId || prefilledCustomerRef.current === customerId) {
      return;
    }

    prefilledCustomerRef.current = customerId;

    void (async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}`);
        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as { data: CustomerDetail };
        const customer = body.data;
        const primaryPhone =
          customer.phones.find((phone) => phone.isPrimary) ?? customer.phones[0];
        const primaryAddress =
          customer.addresses.find((address) => address.isPrimary) ??
          customer.addresses[0];

        setDropoffName(customer.name);
        if (primaryPhone) {
          setDropoffPhone(phoneE164ToFormValue(primaryPhone.phoneE164));
        }
        if (primaryAddress) {
          setDropoffAddress(primaryAddress.formatted);
        }
      } catch {
        // Ignore prefill failures — user can still enter details manually.
      }
    })();
  }, [searchParams]);

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

  const clearQuotes = useCallback(() => {
    setQuotes([]);
    setQuoteFailures([]);
    setSelectedProviderId(null);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      clearQuotes();
      quoteRequestRef.current += 1;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [dropoffAddress, dropoffName, dropoffPhone, scheduleMode, scheduledAt, clearQuotes]);

  useEffect(() => {
    const query = dropoffAddress.trim();

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
  }, [dropoffAddress]);

  const addressVerified =
    verifiedAddress === dropoffAddress.trim() && canRequestQuote(geocoded);

  const dropoffReady =
    dropoffName.trim().length > 0 &&
    dropoffPhone.trim().length >= 10 &&
    addressVerified;

  const requestQuote = useCallback(async () => {
    const query = dropoffAddress.trim();
    if (!query || !dropoffReady) {
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
          dropoffName: dropoffName.trim(),
          dropoffPhone: dropoffPhone.trim(),
          ...(scheduledPickupAt ? { scheduledPickupAt: scheduledPickupAt.toISOString() } : {}),
        }),
      });

      if (requestId !== quoteRequestRef.current) {
        return;
      }

      if (!response.ok) {
        setQuotes([]);
        setQuoteFailures([]);
        setSelectedProviderId(null);
        setFormError(await readApiError(response));
        return;
      }

      const body = (await response.json()) as QuoteApiResponse;
      const nextQuotes = body.data.quotes.map(parseQuote);
      setQuotes(nextQuotes);
      setQuoteFailures(body.data.failures);
      setSelectedProviderId(nextQuotes[0]?.providerId ?? null);
      setGeocoded(body.data.geocoded);
      setVerifiedAddress(query);
    } catch {
      if (requestId === quoteRequestRef.current) {
        setQuotes([]);
        setQuoteFailures([]);
        setSelectedProviderId(null);
        setFormError("Unable to get a quote. Please try again.");
      }
    } finally {
      if (requestId === quoteRequestRef.current) {
        setIsQuoting(false);
      }
    }
  }, [dropoffName, dropoffPhone, dropoffReady, dropoffAddress, scheduledPickupAt]);

  useEffect(() => {
    if (isGeocoding || !dropoffReady) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void requestQuote();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [dropoffReady, isGeocoding, requestQuote, scheduledPickupAt, scheduleMode]);

  const selectedQuote = getSelectedQuote(quotes, selectedProviderId);
  const canSend =
    dropoffReady &&
    isQuoteSelectionValid(quotes, selectedProviderId) &&
    !isSubmitting &&
    !isQuoting;

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

    if (!selectedQuote || !isQuoteSelectionValid(quotes, selectedProviderId)) {
      setFormError("Choose a valid delivery quote before sending.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: selectedQuote.providerId,
          quoteId: selectedQuote.id,
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
      success(`Delivery sent via ${getDeliveryProviderLabel(selectedQuote.providerId)}.`);
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
            Start typing the customer name to use a saved profile, or enter new details.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            id="dropoffName"
            label="Customer name"
            error={fieldErrors.dropoffName}
            hint="Matching saved customers appear as you type."
          >
            <CustomerNameAutocomplete
              id="dropoffName"
              name="dropoffName"
              value={dropoffName}
              onChange={(nextValue) => {
                setDropoffName(nextValue);
                if (fieldErrors.dropoffName) {
                  setFieldErrors((current) => ({ ...current, dropoffName: undefined }));
                }
              }}
              onSelect={(customer) => {
                const values = customerSearchResultToFormValues(customer);
                setDropoffName(values.dropoffName);
                setDropoffPhone(values.dropoffPhone);
                setDropoffAddress(values.dropoffAddress);
                setFieldErrors({});
              }}
              disabled={isSubmitting}
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
              verified={addressVerified}
              isVerifying={isGeocoding}
              verifyError={geocodeError}
              onChange={(nextValue) => {
                setDropoffAddress(nextValue);
                if (fieldErrors.dropoffAddress) {
                  setFieldErrors((current) => ({ ...current, dropoffAddress: undefined }));
                }
              }}
              placeholder="123 King St W, Kitchener, ON N2G 1A1"
            />
          </FormField>
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

      {isQuoting && quotes.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
          Getting quotes…
        </div>
      ) : null}

      {quotes.length > 0 ? (
        <QuoteComparison
          quotes={quotes}
          failures={quoteFailures}
          selectedProviderId={selectedProviderId}
          onSelect={setSelectedProviderId}
        />
      ) : null}

      {formError ? (
        <p className="text-sm text-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {quotes.length > 0 && !isQuoteSelectionValid(quotes, selectedProviderId) ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={!dropoffReady || isQuoting}
            onClick={() => void requestQuote()}
          >
            {isQuoting ? "Getting quotes…" : "Refresh quotes"}
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
