"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormBanner } from "@/components/ui/form-banner";
import { FormField } from "@/components/ui/form-field";
import { ArrowLeft, Call } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { headerActionClassName } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import { validateCustomerDetailFields } from "@/lib/domain/customer/form-validation";
import { formatPhoneForDisplay } from "@/lib/domain/customer/format";
import { CUSTOMER_NOTES_MAX } from "@/lib/domain/customer/limits";
import type { CustomerDetail } from "@/lib/domain/customer/types";
import type { StaffOrderListItem } from "@/lib/domain/order/types";
import { readApiErrorResponse } from "@/lib/forms/read-api-error";
import { formatCadFromCents } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

type CustomerDetailViewProps = {
  customer: CustomerDetail;
  recentOrders?: StaffOrderListItem[];
};

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

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

  const stats = [
    plural(customer.orderCount, "order"),
    customer.deliveryCount > 0
      ? plural(customer.deliveryCount, "dispatch", "dispatches")
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard/customers"
            className="inline-flex h-11 items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Customers
          </Link>
          <Link
            href={`/dashboard/deliveries/new?customerId=${customer.id}`}
            className={cn(
              "inline-flex w-auto shrink-0 items-center justify-center rounded-md bg-accent text-sm font-medium text-text-inverse hover:bg-accent-hover",
              headerActionClassName,
            )}
          >
            New delivery
          </Link>
        </div>
        <p className="text-sm text-text-secondary">{stats}</p>
      </header>

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="py-4">
            <h2 className="text-base font-semibold text-foreground">Profile</h2>
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
            <div className="space-y-2">
              <label
                htmlFor="customerNotes"
                className="text-sm font-medium text-text-secondary"
              >
                Notes (Optional)
              </label>
              <textarea
                id="customerNotes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Gate code, allergies, usual order…"
                maxLength={CUSTOMER_NOTES_MAX}
                rows={3}
                aria-describedby="customerNotes-count"
                className="flex min-h-[5.5rem] w-full resize-y rounded-md border border-border-strong bg-background px-4 py-3 text-base text-foreground placeholder:text-text-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-foreground"
              />
              <p
                id="customerNotes-count"
                className="text-right text-xs tabular-nums text-text-tertiary"
              >
                {notes.length}/{CUSTOMER_NOTES_MAX}
              </p>
            </div>
            {formError ? <FormBanner>{formError}</FormBanner> : null}
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="py-4">
              <h2 className="text-base font-semibold text-foreground">Phones</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer.phones.length === 0 ? (
                <p className="text-sm text-text-secondary">No phone yet.</p>
              ) : (
                customer.phones.map((phone) => (
                  <div
                    key={phone.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2.5"
                  >
                    <a
                      href={`tel:${phone.phoneE164}`}
                      className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                    >
                      <Call className="h-4 w-4 shrink-0" aria-hidden />
                      {formatPhoneForDisplay(phone.phoneE164)}
                    </a>
                    {phone.isPrimary ? (
                      <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                        Primary
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <h2 className="text-base font-semibold text-foreground">Addresses</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer.addresses.length === 0 ? (
                <p className="text-sm text-text-secondary">No address yet.</p>
              ) : (
                customer.addresses.map((address) => (
                  <div
                    key={address.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border px-3 py-2.5"
                  >
                    <p className="text-sm text-foreground">{address.formatted}</p>
                    {address.isPrimary ? (
                      <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                        Primary
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </form>

      <Card>
        <CardHeader className="py-4">
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
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2.5 no-underline transition-colors hover:bg-surface"
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
