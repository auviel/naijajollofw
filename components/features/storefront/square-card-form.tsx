"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type {
  SquareCard,
  SquareVerificationDetails,
} from "@/lib/integrations/payments/square/web-sdk.types";

const SDK_WAIT_MS = 12_000;
const SDK_POLL_MS = 200;

const BLOCKED_MESSAGE =
  "Card form couldn’t load. Firefox tracking protection or an ad blocker may be blocking Square — allow squarecdn.com, then try again.";

type SquareCardFormProps = {
  applicationId: string;
  locationId: string;
  disabled?: boolean;
  onReadyChange?: (ready: boolean) => void;
};

export type SquareCardFormHandle = {
  tokenize: (details: SquareVerificationDetails) => Promise<string>;
};

async function waitForSquare(signal: { cancelled: boolean }): Promise<boolean> {
  if (window.Square) {
    return true;
  }
  const started = Date.now();
  while (Date.now() - started < SDK_WAIT_MS) {
    if (signal.cancelled) {
      return false;
    }
    await new Promise((resolve) => window.setTimeout(resolve, SDK_POLL_MS));
    if (window.Square) {
      return true;
    }
  }
  return Boolean(window.Square);
}

export function useSquareCardForm({
  applicationId,
  locationId,
  disabled = false,
  onReadyChange,
}: SquareCardFormProps) {
  const containerId = useId().replace(/:/g, "");
  const cardRef = useRef<SquareCard | null>(null);
  const onReadyChangeRef = useRef(onReadyChange);
  onReadyChangeRef.current = onReadyChange;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const setReadySafe = useCallback((next: boolean) => {
    setReady(next);
    onReadyChangeRef.current?.(next);
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };

    async function mount() {
      setReadySafe(false);
      setError(null);

      if (disabled || !applicationId || !locationId) {
        return;
      }

      const loaded = await waitForSquare(signal);
      if (signal.cancelled) {
        return;
      }

      if (!loaded || !window.Square) {
        setError(BLOCKED_MESSAGE);
        return;
      }

      try {
        const payments = window.Square.payments(applicationId, locationId);
        const card = await payments.card();
        if (signal.cancelled) {
          await card.destroy();
          return;
        }
        await card.attach(`#${containerId}`);
        cardRef.current = card;
        setReadySafe(true);
      } catch (err) {
        if (!signal.cancelled) {
          const message =
            err instanceof Error ? err.message : "Unable to load the card form.";
          setError(
            /load|network|script|blocked|csp|failed/i.test(message)
              ? BLOCKED_MESSAGE
              : message,
          );
        }
      }
    }

    void mount();

    return () => {
      signal.cancelled = true;
      const card = cardRef.current;
      cardRef.current = null;
      void card?.destroy();
      setReadySafe(false);
    };
  }, [
    applicationId,
    locationId,
    disabled,
    containerId,
    retryToken,
    setReadySafe,
  ]);

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

  function retry() {
    setError(null);
    setReadySafe(false);
    setRetryToken((token) => token + 1);
  }

  return {
    containerId,
    ready,
    error,
    tokenize,
    retry,
  };
}

type SquareCardSlotProps = {
  containerId: string;
  error: string | null;
  onRetry?: () => void;
};

export function SquareCardSlot({
  containerId,
  error,
  onRetry,
}: SquareCardSlotProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={containerId}>
        Card
      </label>
      <div
        id={containerId}
        className="min-h-[56px] rounded-md border border-border bg-surface-elevated px-3 py-2"
      />
      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="text-sm font-medium text-foreground underline underline-offset-2"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
