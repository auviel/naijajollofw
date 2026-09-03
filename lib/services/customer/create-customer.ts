import { requireSessionContext } from "@/lib/auth/session";
import { customerRepository } from "@/lib/db/repositories/customer.repository";
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

  let id: string;

  if (parsed.address?.trim()) {
    const geocoded = await geocodeAddress({
      query: parsed.address,
      storeId: store.id,
    });

    id = await upsertCustomerFromDropoff({
      storeId: store.id,
      name: parsed.name.trim(),
      phoneE164,
      address: geocoded.address,
    });
  } else {
    const existing = await customerRepository.findByPhone(store.id, phoneE164);
    if (existing) {
      id = existing.id;
    } else {
      const created = await customerRepository.createFromContact({
        storeId: store.id,
        name: parsed.name.trim(),
        phoneE164,
      });
      id = created.id;
    }
  }

  logger.info("customer.created", {
    customerId: id,
    storeId: store.id,
  });

  return { id };
}
