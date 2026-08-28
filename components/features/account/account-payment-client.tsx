"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  SquareCardSlot,
  useSquareCardForm,
} from "@/components/features/storefront/square-card-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Plus, X } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import type { SavedCardView } from "@/lib/integrations/payments/square/cards";
import { THIRD_PARTY_BLOCKED } from "@/lib/utils/third-party-blocked";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong.";
}

type AddCardPanelProps = {
  applicationId: string;
  locationId: string;
  environment: string;
  dinerName: string;
  pending: boolean;
  onPendingChange: (pending: boolean) => void;
  onSaved: (card: SavedCardView) => void;
  onCancel: () => void;
};

function AddCardPanel({
  applicationId,
  locationId,
  environment,
  dinerName,
  pending,
  onPendingChange,
  onSaved,
  onCancel,
}: AddCardPanelProps) {
  const { success, error: toastError } = useToast();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const squareSrc =
    environment === "production"
      ? "https://web.squarecdn.com/v1/square.js"
      : "https://sandbox.web.squarecdn.com/v1/square.js";

  const cardForm = useSquareCardForm({
    applicationId,
    locationId,
    disabled: !scriptLoaded,
  });

  useEffect(() => {
    if (scriptLoaded || scriptFailed) {
      return;
    }
    const timeout = window.setTimeout(() => {
      if (!window.Square) {
        setScriptFailed(true);
        setFormError(THIRD_PARTY_BLOCKED.square);
      }
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [scriptLoaded, scriptFailed]);

  async function saveCard() {
    onPendingChange(true);
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
      onSaved(body.data);
      success("Card saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save card.";
      setFormError(message);
      toastError(message);
    } finally {
      onPendingChange(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-surface-elevated p-4">
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
          setFormError(THIRD_PARTY_BLOCKED.square);
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Add a card</h2>
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
  );
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavedCardView | null>(null);

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
      setDeleteTarget(null);
      success("Card removed");
      router.refresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Could not remove card.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Payment
          </h1>
          {available && !showAddForm ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-2"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add card
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-text-secondary">
          Cards are stored securely with Square.
        </p>
      </div>

      {!available ? (
        <p className="text-sm text-text-secondary">
          Saved cards will be available once Square payments are configured.
        </p>
      ) : (
        <div className="space-y-8">
          <ul className="space-y-3">
            {cards.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-text-secondary">
                No saved cards yet.
              </li>
            ) : (
              cards.map((card) => (
                <li
                  key={card.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface-elevated px-4 py-3"
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
                  <IconButton
                    className="h-9 w-9"
                    disabled={pending}
                    onClick={() => setDeleteTarget(card)}
                    aria-label="Remove card"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </IconButton>
                </li>
              ))
            )}
          </ul>

          {showAddForm && applicationId && locationId ? (
            <AddCardPanel
              applicationId={applicationId}
              locationId={locationId}
              environment={environment}
              dinerName={dinerName}
              pending={pending}
              onPendingChange={setPending}
              onSaved={(card) => {
                setCards((current) => [card, ...current]);
                setShowAddForm(false);
                router.refresh();
              }}
              onCancel={() => {
                if (!pending) {
                  setShowAddForm(false);
                }
              }}
            />
          ) : null}

          <ConfirmDialog
            open={deleteTarget !== null}
            title="Remove this card?"
            description={
              deleteTarget
                ? `${deleteTarget.brand ?? "Card"} ···· ${deleteTarget.last4 ?? "????"} will be deleted from your account.`
                : undefined
            }
            confirmLabel="Remove card"
            cancelLabel="Keep card"
            pending={pending && deleteTarget !== null}
            onCancel={() => {
              if (!pending) {
                setDeleteTarget(null);
              }
            }}
            onConfirm={() => {
              if (deleteTarget) {
                void removeCard(deleteTarget.id);
              }
            }}
          />
        </div>
      )}
    </section>
  );
}
