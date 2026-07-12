"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  SquareCard,
  SquareVerificationDetails,
} from "@/lib/integrations/payments/square/web-sdk.types";

type SquareCardFormProps = {
  applicationId: string;
  locationId: string;
  disabled?: boolean;
  onReadyChange?: (ready: boolean) => void;
};

export type SquareCardFormHandle = {
  tokenize: (details: SquareVerificationDetails) => Promise<string>;
};

export function useSquareCardForm({
  applicationId,
  locationId,
  disabled = false,
  onReadyChange,
}: SquareCardFormProps) {
  const containerId = useId().replace(/:/g, "");
  const cardRef = useRef<SquareCard | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      setReady(false);
      onReadyChange?.(false);
      setError(null);

      if (disabled || !applicationId || !locationId) {
        return;
      }

      if (!window.Square) {
        setError("Square payment form failed to load. Refresh and try again.");
        return;
      }

      try {
        const payments = window.Square.payments(applicationId, locationId);
        const card = await payments.card();
        if (cancelled) {
          await card.destroy();
          return;
        }
        await card.attach(`#${containerId}`);
        cardRef.current = card;
        setReady(true);
        onReadyChange?.(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load the card form.",
          );
        }
      }
    }

    void mount();

    return () => {
      cancelled = true;
      const card = cardRef.current;
      cardRef.current = null;
      void card?.destroy();
      setReady(false);
      onReadyChange?.(false);
    };
  }, [applicationId, locationId, disabled, containerId, onReadyChange]);

  async function tokenize(details: SquareVerificationDetails): Promise<string> {
    const card = cardRef.current;
    if (!card) {
      throw new Error("Card form is not ready yet.");
    }

    const result = await card.tokenize(details);
    if (result.status === "OK" && result.token) {
      return result.token;
    }

    const message =
      result.errors?.map((e) => e.message).filter(Boolean).join(" ") ||
      "Card details could not be verified.";
    throw new Error(message);
  }

  return {
    containerId,
    ready,
    error,
    tokenize,
  };
}

type SquareCardSlotProps = {
  containerId: string;
  error: string | null;
};

export function SquareCardSlot({ containerId, error }: SquareCardSlotProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={containerId}>
        Card
      </label>
      <div
        id={containerId}
        className="min-h-[56px] rounded-md border border-border bg-surface-elevated px-3 py-2"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
