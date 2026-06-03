import { requireStoreManager } from "@/lib/auth/session";
import {
  customerRepository,
  mapCustomerToDetail,
} from "@/lib/db/repositories/customer.repository";
import type { CustomerDetail } from "@/lib/domain/customer/types";
import type { UpdateCustomerSchema } from "@/lib/domain/customer/validation";
import { AppError } from "@/lib/utils/errors";

export async function updateCustomer(
  id: string,
  input: UpdateCustomerSchema,
): Promise<CustomerDetail> {
  const user = await requireStoreManager();

  if (input.name === undefined && input.notes === undefined) {
    throw new AppError("VALIDATION_ERROR", "No changes provided", 400);
  }

  try {
    const customer = await customerRepository.update(id, user.storeId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    return mapCustomerToDetail(customer);
  } catch {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }
}
