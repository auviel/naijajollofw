"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AddressAutocomplete } from "@/components/features/deliveries/address-autocomplete";
import { canRequestQuote } from "@/components/features/deliveries/address-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  validateStoreProfileFields,
  type StoreProfileFormErrors,
} from "@/lib/domain/store/form-validation";
import { formatStoreProfileAddress, storeProfileToAddress } from "@/lib/domain/store/format";
import type { StoreProfile } from "@/lib/domain/store/types";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";

type StoreProfileFormProps = {
  store: StoreProfile;
  configuredProviders: {
    uber: boolean;
    doordashEnabled: boolean;
  };
};

function buildAddressQuery(store: StoreProfile): string {
  return `${store.addressLine1}, ${store.city}, ${store.province} ${store.postalCode}`;
}

function storeToGeocoded(store: StoreProfile): GeocodedAddress {
  return {
    address: storeProfileToAddress(store),
    relevance: 1,
    confidence: "high",
    preview: formatStoreProfileAddress(store),
  };
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Unable to save store profile. Please try again.";
}

export function StoreProfileForm({ store, configuredProviders }: StoreProfileFormProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const { success, error: toastError } = useToast();

  const initialAddressQuery = useMemo(() => buildAddressQuery(store), [store]);

  const [name, setName] = useState(store.name);
  const [phone, setPhone] = useState(store.phone);
  const [addressLine2, setAddressLine2] = useState(store.addressLine2 ?? "");
  const [addressQuery, setAddressQuery] = useState(initialAddressQuery);
  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(() =>
    storeToGeocoded(store),
  );
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [enabledUberDirect, setEnabledUberDirect] = useState(store.enabledUberDirect);
  const [enabledDoorDashDrive, setEnabledDoorDashDrive] = useState(
    configuredProviders.doordashEnabled ? store.enabledDoorDashDrive : false,
  );
  const [fieldErrors, setFieldErrors] = useState<StoreProfileFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const query = addressQuery.trim();

    const timeout = window.setTimeout(async () => {
      if (query.length < 5) {
        setGeocoded(null);
        setGeocodeError(null);
        return;
      }

      if (query === initialAddressQuery && addressLine2 === (store.addressLine2 ?? "")) {
        setGeocoded(storeToGeocoded(store));
        setGeocodeError(null);
        return;
      }

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
        setGeocodeError("Unable to verify address. Check your connection and try again.");
      } finally {
        setIsGeocoding(false);
      }
    }, query.length < 5 || (query === initialAddressQuery && addressLine2 === (store.addressLine2 ?? ""))
      ? 0
      : 600);

    return () => window.clearTimeout(timeout);
  }, [addressQuery, addressLine2, initialAddressQuery, store]);

  const addressVerified = canRequestQuote(geocoded) && !isGeocoding && !geocodeError;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validateStoreProfileFields({
      name,
      phone,
      geocoded,
      geocodeError,
    });
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormError("Fix the highlighted fields before saving.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          addressLine2: addressLine2.trim() || undefined,
          addressQuery: addressQuery.trim(),
          enabledUberDirect,
          enabledDoorDashDrive: configuredProviders.doordashEnabled
            ? enabledDoorDashDrive
            : false,
        }),
      });

      if (!response.ok) {
        const message = await readApiError(response);
        setFormError(message);
        toastError(message);
        return;
      }

      const body = (await response.json()) as { data: StoreProfile };
      await updateSession({ storeName: body.data.name });
      success("Store profile saved.");
      router.refresh();
    } catch {
      const message = "Unable to save store profile. Please try again.";
      setFormError(message);
      toastError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl space-y-6 pb-2 sm:pb-0" noValidate>
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-foreground">Pickup location</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Couriers pick up every delivery from this store address.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="storeName" label="Store name" error={fieldErrors.name}>
            <Input
              name="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((current) => ({ ...current, name: undefined }));
                }
              }}
              placeholder="Demo Market — Lester St"
              autoComplete="organization"
            />
          </FormField>

          <FormField
            id="storePhone"
            label="Store phone"
            error={fieldErrors.phone}
            hint="Canadian number — 10 digits or +1 format."
          >
            <Input
              name="phone"
              type="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                if (fieldErrors.phone) {
                  setFieldErrors((current) => ({ ...current, phone: undefined }));
                }
              }}
              placeholder="5195550199"
              autoComplete="tel"
            />
          </FormField>

          <FormField
            id="addressLine2"
            label="Suite or unit"
            error={fieldErrors.addressLine2}
            hint="Optional — apartment, suite, or unit number."
          >
            <Input
              name="addressLine2"
              value={addressLine2}
              onChange={(event) => setAddressLine2(event.target.value)}
              placeholder="#102"
              autoComplete="address-line2"
            />
          </FormField>

          <FormField
            id="addressQuery"
            label="Store address"
            error={fieldErrors.addressQuery}
            hint="Start typing for Canadian address suggestions. We verify your address before saving."
          >
            <AddressAutocomplete
              name="addressQuery"
              value={addressQuery}
              verified={addressVerified}
              isVerifying={isGeocoding}
              verifyError={geocodeError}
              onChange={(nextValue) => {
                setAddressQuery(nextValue);
                if (fieldErrors.addressQuery) {
                  setFieldErrors((current) => ({ ...current, addressQuery: undefined }));
                }
              }}
              placeholder="280 Lester St, Waterloo, ON N2L 0G2"
            />
          </FormField>
        </CardContent>
      </Card>

      {configuredProviders.uber || !configuredProviders.doordashEnabled ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground">Delivery carriers</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Choose which carriers appear when quoting a new delivery.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {configuredProviders.uber ? (
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border-strong"
                  checked={enabledUberDirect}
                  onChange={(event) => setEnabledUberDirect(event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Uber Direct
                  </span>
                  <span className="block text-sm text-text-secondary">
                    Quote and send deliveries with Uber couriers.
                  </span>
                </span>
              </label>
            ) : null}

            {configuredProviders.doordashEnabled ? (
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border-strong"
                  checked={enabledDoorDashDrive}
                  onChange={(event) => setEnabledDoorDashDrive(event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    DoorDash Drive
                  </span>
                  <span className="block text-sm text-text-secondary">
                    Quote and send deliveries with DoorDash Dashers.
                  </span>
                </span>
              </label>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
                <span className="mt-0.5 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
                  Coming soon
                </span>
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    DoorDash Drive
                  </span>
                  <span className="block text-sm text-text-secondary">
                    Not available in Canada yet. Uber Direct is ready to use today.
                  </span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {formError ? (
        <p className="text-sm text-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save store profile"}
        </Button>
      </div>
    </form>
  );
}
