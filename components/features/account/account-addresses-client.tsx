"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "@/components/features/deliveries/address-autocomplete";
import { canRequestQuote } from "@/components/features/deliveries/address-preview";
import { Button } from "@/components/ui/button";
import { Trash } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import type { UserAddressRecord } from "@/lib/db/repositories/user-address.repository";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong.";
}

export function AccountAddressesClient({
  initialAddresses,
}: {
  initialAddresses: UserAddressRecord[];
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [query, setQuery] = useState("");
  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(null);
  const [verifiedQuery, setVerifiedQuery] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    const timeout = window.setTimeout(async () => {
      if (trimmed.length < 5) {
        setGeocoded(null);
        setVerifiedQuery(null);
        return;
      }
      setIsGeocoding(true);
      setFormError(null);
      try {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        });
        if (!response.ok) {
          setGeocoded(null);
          setVerifiedQuery(null);
          setFormError(await readApiError(response));
          return;
        }
        const body = (await response.json()) as { data: GeocodedAddress };
        setGeocoded(body.data);
        setVerifiedQuery(trimmed);
      } catch {
        setGeocoded(null);
        setVerifiedQuery(null);
        setFormError("Could not verify address.");
      } finally {
        setIsGeocoding(false);
      }
    }, trimmed.length < 5 ? 0 : 500);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const verified =
    verifiedQuery === query.trim() && canRequestQuote(geocoded);

  async function addAddress() {
    if (!geocoded || !verified) {
      setFormError("Confirm a valid address first.");
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      const addr = geocoded.address;
      const response = await fetch("/api/diner/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line1: addr.line1,
          line2: addr.line2 || null,
          city: addr.city,
          province: addr.province,
          postalCode: addr.postalCode,
          country: addr.country || "CA",
          latitude: addr.latitude,
          longitude: addr.longitude,
          formatted: addr.formatted || query.trim(),
          label: label.trim() || null,
          isDefault: addresses.length === 0,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const body = (await response.json()) as { data: UserAddressRecord };
      setAddresses((current) => [body.data, ...current]);
      setQuery("");
      setLabel("");
      setGeocoded(null);
      setVerifiedQuery(null);
      success("Address saved");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save.";
      setFormError(message);
      toastError(message);
    } finally {
      setPending(false);
    }
  }

  async function removeAddress(id: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/diner/addresses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setAddresses((current) => current.filter((item) => item.id !== id));
      success("Address removed");
      router.refresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Could not remove.");
    } finally {
      setPending(false);
    }
  }

  async function makeDefault(id: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/diner/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setAddresses((current) =>
        current.map((item) => ({
          ...item,
          isDefault: item.id === id,
        })),
      );
      success("Default address updated");
      router.refresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <ul className="space-y-3">
        {addresses.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-text-secondary">
            No saved addresses yet.
          </li>
        ) : (
          addresses.map((address) => (
            <li
              key={address.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {address.label || "Address"}
                  {address.isDefault ? (
                    <span className="ml-2 text-xs font-semibold text-accent">
                      Default
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {address.formatted}
                </p>
                {!address.isDefault ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void makeDefault(address.id)}
                    className="mt-2 text-xs font-medium text-accent hover:underline"
                  >
                    Make default
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => void removeAddress(address.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-tertiary hover:bg-surface hover:text-foreground"
                aria-label="Remove address"
              >
                <Trash className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="space-y-3 rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Add address</h2>
        <AddressAutocomplete
          value={query}
          onChange={setQuery}
          verified={verified}
          isVerifying={isGeocoding}
          verifyError={formError}
          placeholder="Start typing an address"
        />
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Label (Home, Work…)"
          className="h-11 w-full rounded-md border border-border bg-surface-elevated px-3 text-sm"
          maxLength={40}
        />
        <Button
          type="button"
          disabled={pending || !verified}
          onClick={() => void addAddress()}
        >
          {pending ? "Saving…" : "Save address"}
        </Button>
      </div>
    </div>
  );
}
