"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  SquareCardSlot,
  useSquareCardForm,
} from "@/components/features/storefront/square-card-form";
import { Button } from "@/components/ui/button";
import { Trash } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import type { SavedCardView } from "@/lib/integrations/payments/square/cards";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong.";
}

type AccountPaymentClientProps = {
  available: boolean;
  initialCards: SavedCardView[];
  applicationId: string | null;
  locationId: string | null;
  environment: string;
  dinerName: string;
};

export function AccountPaymentClient({
  available,
  initialCards,
  applicationId,
  locationId,
  environment,
  dinerName,
}: AccountPaymentClientProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [cards, setCards] = useState(initialCards);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const squareSrc =
    environment === "production"
      ? "https://web.squarecdn.com/v1/square.js"
      : "https://sandbox.web.squarecdn.com/v1/square.js";

  const cardForm = useSquareCardForm({
    applicationId: applicationId ?? "",
    locationId: locationId ?? "",
    disabled: !available || !scriptLoaded || !applicationId || !locationId,
  });

  useEffect(() => {
    if (!available || scriptLoaded || scriptFailed) {
      return;
    }
    const timeout = window.setTimeout(() => {
      if (!window.Square) {
        setScriptFailed(true);
        setFormError(
          "Could not load Square. Firefox tracking protection or an ad blocker may be blocking it — allow squarecdn.com and refresh.",
        );
      }
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [available, scriptLoaded, scriptFailed]);

  async function saveCard() {
    if (!available) return;
    setPending(true);
    setFormError(null);
    try {
      const givenName = dinerName.trim().split(/\s+/)[0] || dinerName;
      const familyName =
        dinerName.trim().split(/\s+/).slice(1).join(" ") || givenName;
      const sourceId = await cardForm.tokenize({
        intent: "STORE",
        customerInitiated: true,
        sellerKeyedIn: false,
        billingContact: {
          givenName,
          familyName,
        },
      });
      const response = await fetch("/api/diner/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId,
          idempotencyKey: crypto.randomUUID(),
          cardholderName: dinerName.trim() || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const body = (await response.json()) as { data: SavedCardView };
      setCards((current) => [body.data, ...current]);
      success("Card saved");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save card.";
      setFormError(message);
      toastError(message);
    } finally {
      setPending(false);
    }
  }

  async function removeCard(id: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/diner/cards/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setCards((current) => current.filter((card) => card.id !== id));
      success("Card removed");
      router.refresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Could not remove card.");
    } finally {
      setPending(false);
    }
  }

  if (!available) {
    return (
      <p className="text-sm text-text-secondary">
        Saved cards will be available once Square payments are configured.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <Script
        src={squareSrc}
        strategy="afterInteractive"
        onLoad={() => {
          setScriptLoaded(true);
          setScriptFailed(false);
        }}
        onError={() => {
          setScriptLoaded(false);
          setScriptFailed(true);
          setFormError(
            "Could not load Square. Firefox tracking protection or an ad blocker may be blocking it — allow squarecdn.com and refresh.",
          );
        }}
      />

      <ul className="space-y-3">
        {cards.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-text-secondary">
            No saved cards yet.
          </li>
        ) : (
          cards.map((card) => (
            <li
              key={card.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3"
            >
              <div className="min-w-0 text-sm text-foreground">
                <p className="font-medium">
                  {card.brand ?? "Card"} ···· {card.last4 ?? "????"}
                </p>
                {card.expMonth && card.expYear ? (
                  <p className="mt-0.5 text-text-secondary">
                    Exp {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => void removeCard(card.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-tertiary hover:bg-surface hover:text-foreground"
                aria-label="Remove card"
              >
                <Trash className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="space-y-3 rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Add a card</h2>
        <SquareCardSlot
          containerId={cardForm.containerId}
          error={cardForm.error}
          onRetry={cardForm.retry}
        />
        {formError ? (
          <p className="text-sm text-error" role="alert">
            {formError}
          </p>
        ) : null}
        <Button
          type="button"
          disabled={pending || !cardForm.ready}
          onClick={() => void saveCard()}
        >
          {pending ? "Saving…" : "Save card"}
        </Button>
      </div>
    </div>
  );
}
