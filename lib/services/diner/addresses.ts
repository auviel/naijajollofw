import { requireDiner } from "@/lib/auth/session";
import { customerRepository } from "@/lib/db/repositories/customer.repository";
import { userAddressSchema } from "@/lib/domain/diner/validation";
import { ensureCustomerForDiner } from "@/lib/services/customer/ensure-customer-for-diner";
import { AppError } from "@/lib/utils/errors";

async function requireDinerCustomerId(): Promise<string> {
  const user = await requireDiner();
  if (!user.phoneE164) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Add a phone number to your account before saving addresses.",
      400,
    );
  }
  return ensureCustomerForDiner({
    userId: user.id,
    storeId: user.storeId,
    name: user.name,
    phoneE164: user.phoneE164,
  });
}

export type CustomerAddressView = {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  formatted: string;
  label: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapAddress(address: {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  formatted: string;
  label: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CustomerAddressView {
  return {
    id: address.id,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    country: address.country,
    latitude: address.latitude,
    longitude: address.longitude,
    formatted: address.formatted,
    label: address.label,
    isDefault: address.isPrimary,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

export async function listDinerAddresses() {
  const customerId = await requireDinerCustomerId();
  const addresses = await customerRepository.listAddresses(customerId);
  return addresses.map(mapAddress);
}

export async function createDinerAddress(input: unknown) {
  const customerId = await requireDinerCustomerId();
  const parsed = userAddressSchema.parse(input);
  const created = await customerRepository.createAddress(customerId, {
    ...parsed,
    isPrimary: parsed.isDefault,
  });
  return mapAddress(created);
}

export async function updateDinerAddress(id: string, input: unknown) {
  const customerId = await requireDinerCustomerId();
  const parsed = userAddressSchema.partial().parse(input);
  const updated = await customerRepository.updateAddress(id, customerId, {
    ...parsed,
    ...(parsed.isDefault !== undefined
      ? { isPrimary: parsed.isDefault }
      : {}),
  });
  if (!updated) {
    throw new AppError("NOT_FOUND", "Address not found.", 404);
  }
  return mapAddress(updated);
}

export async function deleteDinerAddress(id: string) {
  const customerId = await requireDinerCustomerId();
  const deleted = await customerRepository.deleteAddress(id, customerId);
  if (!deleted) {
    throw new AppError("NOT_FOUND", "Address not found.", 404);
  }
  return { ok: true as const };
}
