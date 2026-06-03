import { requireStoreManager } from "@/lib/auth/session";
import {
  customerRepository,
  mapCustomerToDetail,
} from "@/lib/db/repositories/customer.repository";
import type { CustomerDetail } from "@/lib/domain/customer/types";
import { AppError } from "@/lib/utils/errors";

export async function getCustomer(id: string): Promise<CustomerDetail> {
  const user = await requireStoreManager();

  const customer = await customerRepository.findByIdAndStoreId(id, user.storeId);
  if (!customer) {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }

  return mapCustomerToDetail(customer);
}
