import type { Metadata } from "next";
import { AccountPaymentClient } from "@/components/features/account/account-payment-client";
import { requireDiner } from "@/lib/auth/session";
import {
  getSquareApplicationId,
  getSquareEnvironment,
  getSquareLocationId,
} from "@/lib/integrations/payments/square/config";
import { canManageSquareCards } from "@/lib/integrations/payments/square/cards";
import { getDinerPaymentState } from "@/lib/services/diner/payment-methods";

export const metadata: Metadata = {
  title: "Payment",
  description: "Manage saved payment methods.",
};

export default async function AccountPaymentPage() {
  const [user, state] = await Promise.all([
    requireDiner(),
    getDinerPaymentState(),
  ]);
  const available = canManageSquareCards();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Payment
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Cards are stored securely with Square.
        </p>
      </div>
      <AccountPaymentClient
        available={available}
        initialCards={state.cards}
        applicationId={available ? getSquareApplicationId() : null}
        locationId={available ? getSquareLocationId() : null}
        environment={getSquareEnvironment()}
        dinerName={user.name}
      />
    </section>
  );
}
