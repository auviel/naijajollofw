"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormBanner } from "@/components/ui/form-banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { validateCustomerDetailFields } from "@/lib/domain/customer/form-validation";
import { formatPhoneForDisplay } from "@/lib/domain/customer/format";
import type { CustomerDetail } from "@/lib/domain/customer/types";
import type { StaffOrderListItem } from "@/lib/domain/order/types";
import { readApiErrorResponse } from "@/lib/forms/read-api-error";
import { formatCadFromCents } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/date";

type CustomerDetailViewProps = {
  customer: CustomerDetail;
  recentOrders?: StaffOrderListItem[];
};

export function CustomerDetailView({
  customer: initialCustomer,
  recentOrders = [],
}: CustomerDetailViewProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [customer, setCustomer] = useState(initialCustomer);
  const [name, setName] = useState(initialCustomer.name);
  const [notes, setNotes] = useState(initialCustomer.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name", string>>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCustomerDetailFields({ name });
    setFieldErrors(validation);
    setFormError(null);
    if (Object.keys(validation).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const { message, fieldErrors: apiFields } =
          await readApiErrorResponse(response);
        setFieldErrors((current) => ({ ...current, ...apiFields }));
        setFormError(message);
        toastError(message);
        return;
      }

      const body = (await response.json()) as { data: CustomerDetail };
      setCustomer(body.data);
      setName(body.data.name);
      setNotes(body.data.notes ?? "");
      success("Customer updated.");
      router.refresh();
    } catch {
      toastError("Unable to update customer.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{customer.name}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {customer.orderCount} orders · {customer.deliveryCount} courier
            dispatches · Added {formatDateTime(customer.createdAt)}
          </p>
        </div>
        <Link
          href={`/dashboard/deliveries/new?customerId=${customer.id}`}
          className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-text-inverse transition-colors duration-fast hover:bg-accent-hover"
        >
          New delivery
        </Link>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField id="customerName" label="Name" error={fieldErrors.name}>
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (fieldErrors.name) {
                    setFieldErrors((current) => ({
                      ...current,
                      name: undefined,
                    }));
                  }
                }}
              />
            </FormField>
            <FormField id="customerNotes" label="Notes">
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Apartment instructions, preferences, etc."
              />
            </FormField>
            {formError ? <FormBanner>{formError}</FormBanner> : null}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">Phone numbers</h2>
              <p className="text-sm text-text-secondary">
                New numbers from deliveries are added here automatically.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.phones.map((phone) => (
                <div
                  key={phone.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="text-foreground">
                    {formatPhoneForDisplay(phone.phoneE164)}
                  </span>
                  {phone.isPrimary ? (
                    <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                      Primary
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">Secondary</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">Addresses</h2>
              <p className="text-sm text-text-secondary">
                Different delivery addresses are saved as secondary locations.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.addresses.map((address) => (
                <div
                  key={address.id}
                  className="rounded-md border border-border px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-foreground">{address.formatted}</p>
                    {address.isPrimary ? (
                      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                        Primary
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-text-tertiary">Secondary</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </form>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">Recent orders</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-text-secondary">No orders yet.</p>
          ) : (
            recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 no-underline transition-colors hover:bg-surface"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {order.displayNumber
                      ? `${order.displayNumber} · `
                      : null}
                    {order.itemSummary || "Courier job"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {order.placedAt
                      ? formatDateTime(order.placedAt)
                      : formatDateTime(order.createdAt)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                  {formatCadFromCents(order.totalCents)}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
