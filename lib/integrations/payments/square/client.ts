import { randomUUID } from "crypto";
import {
  SquareClient,
  SquareEnvironment,
  SquareError,
} from "square";
import {
  getSquareAccessToken,
  getSquareEnvironment,
  getSquareLocationId,
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

export type CreateSquarePaymentInput = {
  sourceId: string;
  amountCents: number;
  currency?: string;
  idempotencyKey: string;
  note?: string;
  referenceId?: string;
  buyerEmailAddress?: string;
};

export type SquarePaymentResult = {
  paymentId: string;
  status: string;
  receiptUrl: string | null;
};

function mapSquareError(error: unknown): AppError {
  if (error instanceof SquareError) {
    const first = error.errors?.[0];
    const detail =
      first?.detail || first?.code || error.message || "Payment failed.";
    logger.error("square.payment.failed", {
      code: first?.code,
      category: first?.category,
      detail,
    });
    return new AppError("PROVIDER_ERROR", detail, 402, {
      squareCode: first?.code,
      squareCategory: first?.category,
    });
  }

  logger.error("square.payment.unexpected", {
    error: error instanceof Error ? error.message : String(error),
  });
  return new AppError("PROVIDER_ERROR", "Unable to process payment.", 502);
}

export async function createSquarePayment(
  input: CreateSquarePaymentInput,
): Promise<SquarePaymentResult> {
  const locationId = getSquareLocationId();
  const currency = (input.currency ?? "CAD").toUpperCase();

  try {
    const response = await getClient().payments.create({
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey || randomUUID(),
      amountMoney: {
        amount: BigInt(input.amountCents),
        currency: currency as "CAD",
      },
      autocomplete: true,
      locationId,
      referenceId: input.referenceId,
      note: input.note,
      buyerEmailAddress: input.buyerEmailAddress,
    });

    const payment = response.payment;
    if (!payment?.id) {
      throw new AppError("PROVIDER_ERROR", "Square did not return a payment.", 502);
    }

    const status = payment.status ?? "UNKNOWN";
    if (status === "FAILED" || status === "CANCELED") {
      throw new AppError("PROVIDER_ERROR", "Card payment was declined.", 402, {
        squareStatus: status,
      });
    }

    return {
      paymentId: payment.id,
      status,
      receiptUrl: payment.receiptUrl ?? null,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw mapSquareError(error);
  }
}
