import { requireDiner } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { createCardSchema } from "@/lib/domain/diner/validation";
import {
  canManageSquareCards,
  createSquareCard,
  createSquareCustomer,
  disableSquareCard,
  listSquareCards,
  type SavedCardView,
} from "@/lib/integrations/payments/square/cards";
import { AppError } from "@/lib/utils/errors";

async function ensureSquareCustomerId(userId: string): Promise<string> {
  const user = await userRepository.findById(userId);
  if (!user || user.role !== "DINER") {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }
  if (user.squareCustomerId) {
    return user.squareCustomerId;
  }
  const customerId = await createSquareCustomer({
    givenName: user.name,
    email: user.email,
    phoneE164: user.phoneE164,
    referenceId: user.id,
  });
  await userRepository.updateSquareCustomerId(user.id, customerId);
  return customerId;
}

export async function getDinerPaymentState(): Promise<{
  available: boolean;
  cards: SavedCardView[];
}> {
  const user = await requireDiner();
  if (!canManageSquareCards()) {
    return { available: false, cards: [] };
  }
  const full = await userRepository.findById(user.id);
  if (!full?.squareCustomerId) {
    return { available: true, cards: [] };
  }
  const cards = await listSquareCards(full.squareCustomerId);
  return { available: true, cards };
}

export async function addDinerCard(input: unknown): Promise<SavedCardView> {
  const user = await requireDiner();
  if (!canManageSquareCards()) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Card management is unavailable until Square payments are configured.",
      400,
    );
  }
  const parsed = createCardSchema.parse(input);
  const customerId = await ensureSquareCustomerId(user.id);
  return createSquareCard({
    customerId,
    sourceId: parsed.sourceId,
    cardholderName: parsed.cardholderName ?? user.name,
    referenceId: user.id,
    idempotencyKey: parsed.idempotencyKey,
  });
}

export async function removeDinerCard(cardId: string): Promise<{ ok: true }> {
  const user = await requireDiner();
  if (!canManageSquareCards()) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Card management is unavailable until Square payments are configured.",
      400,
    );
  }
  const full = await userRepository.findById(user.id);
  if (!full?.squareCustomerId) {
    throw new AppError("NOT_FOUND", "Card not found.", 404);
  }
  const cards = await listSquareCards(full.squareCustomerId);
  if (!cards.some((card) => card.id === cardId)) {
    throw new AppError("NOT_FOUND", "Card not found.", 404);
  }
  await disableSquareCard(cardId);
  return { ok: true };
}
