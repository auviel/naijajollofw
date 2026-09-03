import { requireStoreManager } from "@/lib/auth/session";
import { customerRepository } from "@/lib/db/repositories/customer.repository";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function deleteCustomer(id: string): Promise<void> {
  const user = await requireStoreManager();

  const existing = await customerRepository.findByIdAndStoreId(id, user.storeId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }

  await customerRepository.deleteByIdAndStoreId(id, user.storeId);

  logger.info("customer.deleted", {
    customerId: id,
    storeId: user.storeId,
  });
}
