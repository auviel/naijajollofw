"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "@/components/features/deliveries/address-autocomplete";
import {
  canRequestQuote,
} from "@/components/features/deliveries/address-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  validateCustomerFormFields,
  type CustomerFormErrors,
} from "@/lib/domain/customer/form-validation";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";

type CreateCustomerResponse = {
  data: {
    id: string;
  };
};

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

export function CustomerForm() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(null);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CustomerFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const query = address.trim();
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
  }, [address]);

  const addressVerified =
    verifiedAddress === address.trim() && canRequestQuote(geocoded);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateCustomerFormFields({
      name,
      phone,
      addressVerified,
      geocodeError,
    });
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormError("Fix the highlighted fields first.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
        }),
      });

      if (!response.ok) {
        const message = await readApiError(response);
        setFormError(message);
        toastError(message);
        return;
      }

      const body = (await response.json()) as CreateCustomerResponse;
      success("Customer saved.");
      router.push(`/dashboard/customers/${body.data.id}`);
      router.refresh();
    } catch {
      const message = "Unable to save customer. Please try again.";
      setFormError(message);
      toastError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl space-y-4"
      noValidate
    >
      <Card>
        <CardHeader className="py-4">
          <h2 className="text-base font-semibold text-foreground">Customer details</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Save a customer now and reuse their details when sending deliveries.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="customerName" label="Name" error={fieldErrors.name}>
            <Input
              name="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((current) => ({ ...current, name: undefined }));
                }
              }}
              placeholder="Jane Doe"
              autoComplete="name"
            />
          </FormField>

          <FormField
            id="customerPhone"
            label="Phone"
            error={fieldErrors.phone}
            hint="10-digit Canadian number."
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
              placeholder="5195550100"
              autoComplete="tel"
            />
          </FormField>

          <FormField
            id="customerAddress"
            label="Address"
            error={fieldErrors.address}
            hint="Start typing, then pick an address from the list."
          >
            <AddressAutocomplete
              name="address"
              value={address}
              verified={addressVerified}
              isVerifying={isGeocoding}
              verifyError={geocodeError}
              onChange={(nextValue) => {
                setAddress(nextValue);
                if (fieldErrors.address) {
                  setFieldErrors((current) => ({ ...current, address: undefined }));
                }
              }}
              placeholder="123 King St W, Kitchener, ON N2G 1A1"
            />
          </FormField>
        </CardContent>
      </Card>

      {formError ? (
        <p className="text-sm text-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/dashboard/customers")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isGeocoding}>
          {isSubmitting ? "Saving…" : "Save customer"}
        </Button>
      </div>
    </form>
  );
}
