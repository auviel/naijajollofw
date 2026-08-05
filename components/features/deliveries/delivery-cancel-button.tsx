"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { DeliveryProviderId } from "@/lib/domain/delivery/types";
import { getDeliveryProviderLabel } from "@/lib/domain/delivery/types";
import { getCancelReasonLabel } from "@/lib/integrations/delivery/cancel-reasons";
import type { CancelDeliverySchema } from "@/lib/domain/delivery/validation";

const CANCEL_REASONS: CancelDeliverySchema["reason"][] = [
  "CUSTOMER_CALLED_TO_CANCEL",
  "OUT_OF_ITEMS",
  "RESTAURANT_TOO_BUSY",
  "OTHER",
];

type CancelDeliveryButtonProps = {
  deliveryId: string;
  providerId: DeliveryProviderId;
  disabled?: boolean;
};

export function CancelDeliveryButton({
  deliveryId,
  providerId,
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
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
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

      <ConfirmDialog
        open={open}
        title="Cancel delivery?"
        description={`This notifies ${getDeliveryProviderLabel(providerId)} and stops the courier if they have not completed dropoff yet.`}
        confirmLabel="Confirm cancel"
        cancelLabel="Keep delivery"
        pending={isSubmitting}
        confirmDisabled={reason === "OTHER" && !details.trim()}
        onCancel={() => setOpen(false)}
        onConfirm={() => void handleCancel()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="cancelReason"
              className="text-sm font-medium text-text-secondary"
            >
              Reason
            </label>
            <Select
              id="cancelReason"
              value={reason}
              onChange={(next) =>
                setReason(next as CancelDeliverySchema["reason"])
              }
              options={CANCEL_REASONS.map((option) => ({
                value: option,
                label: getCancelReasonLabel(option),
              }))}
            />
          </div>

          {reason === "OTHER" ? (
            <div className="space-y-2">
              <label
                htmlFor="cancelDetails"
                className="text-sm font-medium text-text-secondary"
              >
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
        </div>
      </ConfirmDialog>
    </>
  );
}
