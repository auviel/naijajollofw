"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { CancelDeliverySchema } from "@/lib/domain/delivery/validation";

const CANCEL_REASONS: {
  value: CancelDeliverySchema["reason"];
  label: string;
}[] = [
  { value: "CUSTOMER_CALLED_TO_CANCEL", label: "Customer called to cancel" },
  { value: "OUT_OF_ITEMS", label: "Out of items" },
  { value: "RESTAURANT_TOO_BUSY", label: "Restaurant too busy" },
  { value: "OTHER", label: "Other" },
];

type CancelDeliveryButtonProps = {
  deliveryId: string;
  disabled?: boolean;
};

export function CancelDeliveryButton({
  deliveryId,
  disabled = false,
}: CancelDeliveryButtonProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CancelDeliverySchema["reason"]>(
    "CUSTOMER_CALLED_TO_CANCEL",
  );
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleCancel() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          ...(reason === "OTHER" ? { details: details.trim() } : {}),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        const message = body.error ?? "Unable to cancel delivery.";
        setError(message);
        toastError(message);
        return;
      }

      setCancelled(true);
      setOpen(false);
      success("Delivery cancelled.");
      router.refresh();
    } catch {
      const message = "Unable to cancel delivery. Please try again.";
      setError(message);
      toastError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        className="w-full"
        disabled={disabled || cancelled || isSubmitting}
        onClick={() => setOpen(true)}
      >
        {cancelled ? "Delivery cancelled" : "Cancel delivery"}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-delivery-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-border bg-surface-elevated p-5 shadow-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="cancel-delivery-title" className="text-lg font-semibold text-foreground">
              Cancel delivery
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              This notifies Uber Direct and stops the courier if they have not completed
              dropoff yet.
            </p>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="cancelReason" className="text-sm font-medium text-text-secondary">
                  Reason
                </label>
                <select
                  id="cancelReason"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value as CancelDeliverySchema["reason"])
                  }
                  className="flex h-12 w-full rounded-md border border-border-strong bg-background px-4 text-base text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  {CANCEL_REASONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {reason === "OTHER" ? (
                <div className="space-y-2">
                  <label htmlFor="cancelDetails" className="text-sm font-medium text-text-secondary">
                    Details
                  </label>
                  <Input
                    id="cancelDetails"
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    placeholder="Explain why you're cancelling"
                    required
                  />
                </div>
              ) : null}

              {error ? (
                <p className="text-sm text-error" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Keep delivery
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={isSubmitting || (reason === "OTHER" && !details.trim())}
                >
                  {isSubmitting ? "Cancelling…" : "Confirm cancel"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
