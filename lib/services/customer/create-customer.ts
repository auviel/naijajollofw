import { requireSessionContext } from "@/lib/auth/session";
import { createCustomerSchema } from "@/lib/domain/customer/validation";
import { upsertCustomerFromDropoff } from "@/lib/services/customer/upsert-from-dropoff";
import { geocodeAddress } from "@/lib/services/geocoding/geocode-address";
import { AppError } from "@/lib/utils/errors";
import { normalizeCanadianPhone } from "@/lib/utils/phone";
import { logger } from "@/lib/utils/logger";

export type CreateCustomerResult = {
  id: string;
};

export async function createCustomer(input: unknown): Promise<CreateCustomerResult> {
  const { store } = await requireSessionContext();
  const parsed = createCustomerSchema.parse(input);

  const phoneE164 = normalizeCanadianPhone(parsed.phone);
  if (!phoneE164) {
    throw new AppError("VALIDATION_ERROR", "Enter a valid Canadian phone number", 400);
  }

  const geocoded = await geocodeAddress({
    query: parsed.address,
    storeId: store.id,
  });

  const id = await upsertCustomerFromDropoff({
    storeId: store.id,
    name: parsed.name.trim(),
    phoneE164,
    address: geocoded.address,
  });

  logger.info("customer.created", {
    customerId: id,
    storeId: store.id,
  });

  return { id };
}
