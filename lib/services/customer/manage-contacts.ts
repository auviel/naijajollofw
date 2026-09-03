import { requireStoreManager } from "@/lib/auth/session";
import {
  customerRepository,
  mapCustomerToDetail,
} from "@/lib/db/repositories/customer.repository";
import type { CustomerDetail } from "@/lib/domain/customer/types";
import {
  customerAddressInputSchema,
  customerPhoneInputSchema,
} from "@/lib/domain/customer/validation";
import { geocodeAddress } from "@/lib/services/geocoding/geocode-address";
import { AppError } from "@/lib/utils/errors";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

async function requireCustomer(id: string) {
  const user = await requireStoreManager();
  const customer = await customerRepository.findByIdAndStoreId(id, user.storeId);
  if (!customer) {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }
  return { user, customer };
}

export async function addCustomerPhone(
  customerId: string,
  input: unknown,
): Promise<CustomerDetail> {
  const { user } = await requireCustomer(customerId);
  const parsed = customerPhoneInputSchema.parse(input);
  const phoneE164 = normalizeCanadianPhone(parsed.phone);
  if (!phoneE164) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Enter a valid Canadian phone number",
      400,
    );
  }

  try {
    await customerRepository.createPhone(user.storeId, customerId, {
      phoneE164,
      label: parsed.label ?? null,
      isPrimary: parsed.isPrimary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Unique constraint") || message.includes("Unique")) {
      throw new AppError(
        "CONFLICT",
        "That phone number is already on a customer",
        409,
      );
    }
    throw err;
  }

  const refreshed = await customerRepository.findByIdAndStoreId(
    customerId,
    user.storeId,
  );
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }
  return mapCustomerToDetail(refreshed);
}

export async function updateCustomerPhone(
  customerId: string,
  phoneId: string,
  input: unknown,
): Promise<CustomerDetail> {
  const { user } = await requireCustomer(customerId);
  const parsed = customerPhoneInputSchema.partial().parse(input);
  const phoneE164 =
    parsed.phone !== undefined
      ? normalizeCanadianPhone(parsed.phone)
      : undefined;
  if (parsed.phone !== undefined && !phoneE164) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Enter a valid Canadian phone number",
      400,
    );
  }

  try {
    const updated = await customerRepository.updatePhone(
      user.storeId,
      customerId,
      phoneId,
      {
        ...(phoneE164 ? { phoneE164 } : {}),
        ...(parsed.label !== undefined ? { label: parsed.label } : {}),
        ...(parsed.isPrimary !== undefined
          ? { isPrimary: parsed.isPrimary }
          : {}),
      },
    );
    if (!updated) {
      throw new AppError("NOT_FOUND", "Phone not found", 404);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : "";
    if (message.includes("Unique constraint") || message.includes("Unique")) {
      throw new AppError(
        "CONFLICT",
        "That phone number is already on a customer",
        409,
      );
    }
    throw err;
  }

  const refreshed = await customerRepository.findByIdAndStoreId(
    customerId,
    user.storeId,
  );
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }
  return mapCustomerToDetail(refreshed);
}

export async function deleteCustomerPhone(
  customerId: string,
  phoneId: string,
): Promise<CustomerDetail> {
  const { user, customer } = await requireCustomer(customerId);
  if (customer.phones.length <= 1) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Keep at least one phone on the customer",
      400,
    );
  }
  const deleted = await customerRepository.deletePhone(
    user.storeId,
    customerId,
    phoneId,
  );
  if (!deleted) {
    throw new AppError("NOT_FOUND", "Phone not found", 404);
  }

  const refreshed = await customerRepository.findByIdAndStoreId(
    customerId,
    user.storeId,
  );
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }
  return mapCustomerToDetail(refreshed);
}

export async function addCustomerAddress(
  customerId: string,
  input: unknown,
): Promise<CustomerDetail> {
  const { user } = await requireCustomer(customerId);
  const parsed = customerAddressInputSchema.parse(input);
  const geocoded = await geocodeAddress({
    query: parsed.address,
    storeId: user.storeId,
  });

  await customerRepository.createAddress(customerId, {
    ...geocoded.address,
    label: parsed.label ?? null,
    isPrimary: parsed.isPrimary,
  });

  const refreshed = await customerRepository.findByIdAndStoreId(
    customerId,
    user.storeId,
  );
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }
  return mapCustomerToDetail(refreshed);
}

export async function updateCustomerAddress(
  customerId: string,
  addressId: string,
  input: unknown,
): Promise<CustomerDetail> {
  const { user } = await requireCustomer(customerId);
  const parsed = customerAddressInputSchema.partial().parse(input);

  let addressPatch: Parameters<typeof customerRepository.updateAddress>[2] = {
    ...(parsed.label !== undefined ? { label: parsed.label } : {}),
    ...(parsed.isPrimary !== undefined ? { isPrimary: parsed.isPrimary } : {}),
  };

  if (parsed.address !== undefined) {
    const geocoded = await geocodeAddress({
      query: parsed.address,
      storeId: user.storeId,
    });
    addressPatch = {
      ...addressPatch,
      ...geocoded.address,
    };
  }

  const updated = await customerRepository.updateAddress(
    addressId,
    customerId,
    addressPatch,
  );
  if (!updated) {
    throw new AppError("NOT_FOUND", "Address not found", 404);
  }

  const refreshed = await customerRepository.findByIdAndStoreId(
    customerId,
    user.storeId,
  );
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }
  return mapCustomerToDetail(refreshed);
}

export async function deleteCustomerAddress(
  customerId: string,
  addressId: string,
): Promise<CustomerDetail> {
  const { user } = await requireCustomer(customerId);
  const deleted = await customerRepository.deleteAddress(addressId, customerId);
  if (!deleted) {
    throw new AppError("NOT_FOUND", "Address not found", 404);
  }

  const refreshed = await customerRepository.findByIdAndStoreId(
    customerId,
    user.storeId,
  );
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }
  return mapCustomerToDetail(refreshed);
}
