"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "@/components/features/deliveries/address-autocomplete";
import { canRequestQuote } from "@/components/features/deliveries/address-preview";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Pencil, X } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { withAddressLine2 } from "@/lib/domain/address/format";
import type { CustomerAddressView } from "@/lib/services/diner/addresses";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong.";
}

function streetQueryFromAddress(address: CustomerAddressView): string {
  return [
    address.line1,
    `${address.city}, ${address.province} ${address.postalCode}`,
    address.country,
  ].join(", ");
}

function geocodedFromSavedAddress(
  address: CustomerAddressView,
): GeocodedAddress | null {
  if (address.latitude == null || address.longitude == null) {
    return null;
  }
  return {
    address: {
      line1: address.line1,
      line2: address.line2 ?? undefined,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
      formatted: address.formatted,
    },
    relevance: 1,
    confidence: "high",
    preview: address.formatted,
  };
}

type AddressFormPanelProps = {
  pending: boolean;
  onPendingChange: (pending: boolean) => void;
  onSaved: (address: CustomerAddressView) => void;
  onCancel: () => void;
  defaultIsFirst: boolean;
  initialAddress?: CustomerAddressView;
};

function AddressFormPanel({
  pending,
  onPendingChange,
  onSaved,
  onCancel,
  defaultIsFirst,
  initialAddress,
}: AddressFormPanelProps) {
  const { success, error: toastError } = useToast();
  const isEditing = Boolean(initialAddress);
  const initialQuery = initialAddress
    ? streetQueryFromAddress(initialAddress)
    : "";
  const initialGeocoded = initialAddress
    ? geocodedFromSavedAddress(initialAddress)
    : null;

  const [query, setQuery] = useState(initialQuery);
  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(
    initialGeocoded,
  );
  const [verifiedQuery, setVerifiedQuery] = useState<string | null>(
    initialGeocoded ? initialQuery.trim() : null,
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [unit, setUnit] = useState(initialAddress?.line2 ?? "");
  const [label, setLabel] = useState(initialAddress?.label ?? "");
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

  async function saveAddress() {
    if (!geocoded || !verified) {
      setFormError("Confirm a valid address first.");
      return;
    }
    onPendingChange(true);
    setFormError(null);
    try {
      const addr = geocoded.address;
      const line2 = unit.trim() || addr.line2 || null;
      const payload = {
        line1: addr.line1,
        line2,
        city: addr.city,
        province: addr.province,
        postalCode: addr.postalCode,
        country: addr.country || "CA",
        latitude: addr.latitude,
        longitude: addr.longitude,
        formatted: withAddressLine2(addr.formatted || query.trim(), unit.trim()),
        label: label.trim() || null,
        ...(isEditing ? {} : { isDefault: defaultIsFirst }),
      };
      const response = await fetch(
        isEditing
          ? `/api/diner/addresses/${initialAddress!.id}`
          : "/api/diner/addresses",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const body = (await response.json()) as { data: CustomerAddressView };
      onSaved(body.data);
      success(isEditing ? "Address updated" : "Address saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save.";
      setFormError(message);
      toastError(message);
    } finally {
      onPendingChange(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-surface-elevated p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          {isEditing ? "Edit address" : "Add address"}
        </h2>
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-2 text-sm"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
      <AddressAutocomplete
        value={query}
        onChange={setQuery}
        verified={verified}
        isVerifying={isGeocoding}
        verifyError={formError}
        placeholder="Start typing an address"
      />
      <input
        value={unit}
        onChange={(event) => setUnit(event.target.value)}
        placeholder="Apt / unit (optional)"
        autoComplete="address-line2"
        className="h-11 w-full rounded-md border border-border bg-surface-elevated px-3 text-base"
        maxLength={40}
      />
      <input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="Label (Home, Work…)"
        className="h-11 w-full rounded-md border border-border bg-surface-elevated px-3 text-base"
        maxLength={40}
      />
      <Button
        type="button"
        disabled={pending || !verified}
        onClick={() => void saveAddress()}
      >
        {pending
          ? "Saving…"
          : isEditing
            ? "Update address"
            : "Save address"}
      </Button>
    </div>
  );
}

export function AccountAddressesClient({
  initialAddresses,
}: {
  initialAddresses: CustomerAddressView[];
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] =
    useState<CustomerAddressView | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerAddressView | null>(
    null,
  );

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
      setDeleteTarget(null);
      if (editingAddress?.id === id) {
        setEditingAddress(null);
      }
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
          <li className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-text-secondary">
            No saved addresses yet.
          </li>
        ) : (
          addresses.map((address) =>
            editingAddress?.id === address.id ? (
              <li key={address.id}>
                <AddressFormPanel
                  pending={pending}
                  onPendingChange={setPending}
                  defaultIsFirst={false}
                  initialAddress={address}
                  onSaved={(updated) => {
                    setAddresses((current) =>
                      current.map((item) =>
                        item.id === updated.id ? updated : item,
                      ),
                    );
                    setEditingAddress(null);
                    router.refresh();
                  }}
                  onCancel={() => {
                    if (!pending) {
                      setEditingAddress(null);
                    }
                  }}
                />
              </li>
            ) : (
              <li
                key={address.id}
                className="flex items-start justify-between gap-3 rounded-2xl bg-surface-elevated px-4 py-3"
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
                      disabled={pending || editingAddress !== null}
                      onClick={() => void makeDefault(address.id)}
                      className="mt-2 text-xs font-medium text-accent hover:underline"
                    >
                      Make default
                    </button>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    className="h-9 w-9"
                    disabled={pending || showAddForm}
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingAddress(address);
                    }}
                    aria-label="Edit address"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </IconButton>
                  <IconButton
                    className="h-9 w-9"
                    disabled={pending}
                    onClick={() => setDeleteTarget(address)}
                    aria-label="Remove address"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </IconButton>
                </div>
              </li>
            ),
          )
        )}
      </ul>

      {showAddForm ? (
        <AddressFormPanel
          pending={pending}
          onPendingChange={setPending}
          defaultIsFirst={addresses.length === 0}
          onSaved={(address) => {
            setAddresses((current) => [address, ...current]);
            setShowAddForm(false);
            router.refresh();
          }}
          onCancel={() => {
            if (!pending) {
              setShowAddForm(false);
            }
          }}
        />
      ) : editingAddress === null ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEditingAddress(null);
            setShowAddForm(true);
          }}
        >
          Add address
        </Button>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove this address?"
        description={
          deleteTarget
            ? `${deleteTarget.label || "This address"} will be deleted from your account.`
            : undefined
        }
        confirmLabel="Remove address"
        cancelLabel="Keep address"
        pending={pending && deleteTarget !== null}
        onCancel={() => {
          if (!pending) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          if (deleteTarget) {
            void removeAddress(deleteTarget.id);
          }
        }}
      />
    </div>
  );
}
