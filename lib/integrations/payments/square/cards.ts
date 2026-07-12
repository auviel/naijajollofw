import { randomUUID } from "crypto";
import { SquareClient, SquareEnvironment, SquareError } from "square";
import {
  getSquareAccessToken,
  getSquareEnvironment,
  isCheckoutSimulatePayments,
  isSquareConfigured,
} from "@/lib/integrations/payments/square/config";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

let client: SquareClient | null = null;

function getClient(): SquareClient {
  if (client) {
    return client;
  }
  const environment =
    getSquareEnvironment() === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;
  client = new SquareClient({
    token: getSquareAccessToken(),
    environment,
  });
  return client;
}

function mapSquareError(error: unknown, fallback: string): AppError {
  if (error instanceof SquareError) {
    const first = error.errors?.[0];
    const detail = first?.detail || first?.code || error.message || fallback;
    logger.error("square.cards.failed", {
      code: first?.code,
      detail,
    });
    return new AppError("PROVIDER_ERROR", detail, 502, {
      squareCode: first?.code,
    });
  }
  return new AppError("PROVIDER_ERROR", fallback, 502);
}

export function canManageSquareCards(): boolean {
  return isSquareConfigured() && !isCheckoutSimulatePayments();
}

export type SavedCardView = {
  id: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  cardholderName: string | null;
};

export async function createSquareCustomer(input: {
  givenName: string;
  email: string;
  phoneE164?: string | null;
  referenceId: string;
}): Promise<string> {
  try {
    const response = await getClient().customers.create({
      idempotencyKey: randomUUID(),
      givenName: input.givenName,
      emailAddress: input.email,
      phoneNumber: input.phoneE164 ?? undefined,
      referenceId: input.referenceId.slice(0, 40),
    });
    const id = response.customer?.id;
    if (!id) {
      throw new AppError("PROVIDER_ERROR", "Square did not return a customer.", 502);
    }
    return id;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapSquareError(error, "Unable to create Square customer.");
  }
}

export async function listSquareCards(
  customerId: string,
): Promise<SavedCardView[]> {
  try {
    const page = await getClient().cards.list({
      customerId,
      includeDisabled: false,
    });
    const cards: SavedCardView[] = [];
    for await (const card of page) {
      if (!card.id || card.enabled === false) continue;
      cards.push({
        id: card.id,
        brand: card.cardBrand ?? null,
        last4: card.last4 ?? null,
        expMonth: card.expMonth != null ? Number(card.expMonth) : null,
        expYear: card.expYear != null ? Number(card.expYear) : null,
        cardholderName: card.cardholderName ?? null,
      });
    }
    return cards;
  } catch (error) {
    throw mapSquareError(error, "Unable to list saved cards.");
  }
}

export async function createSquareCard(input: {
  customerId: string;
  sourceId: string;
  cardholderName?: string;
  referenceId?: string;
  idempotencyKey: string;
}): Promise<SavedCardView> {
  try {
    const response = await getClient().cards.create({
      idempotencyKey: input.idempotencyKey,
      sourceId: input.sourceId,
      card: {
        customerId: input.customerId,
        cardholderName: input.cardholderName,
        referenceId: input.referenceId?.slice(0, 128),
      },
    });
    const card = response.card;
    if (!card?.id) {
      throw new AppError("PROVIDER_ERROR", "Square did not return a card.", 502);
    }
    return {
      id: card.id,
      brand: card.cardBrand ?? null,
      last4: card.last4 ?? null,
      expMonth: card.expMonth != null ? Number(card.expMonth) : null,
      expYear: card.expYear != null ? Number(card.expYear) : null,
      cardholderName: card.cardholderName ?? null,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapSquareError(error, "Unable to save card.");
  }
}

export async function disableSquareCard(cardId: string): Promise<void> {
  try {
    await getClient().cards.disable({ cardId });
  } catch (error) {
    throw mapSquareError(error, "Unable to remove card.");
  }
}
