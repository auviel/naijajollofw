import { orderRepository } from "@/lib/db/repositories/order.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { ensureCustomerForDiner } from "@/lib/services/customer/ensure-customer-for-diner";
import { logger } from "@/lib/utils/logger";

/**
 * Link CRM customer when possible, then attach matching guest orders to this
 * diner (by phone Customer and/or receipt email). Safe to call repeatedly.
 */
export async function syncDinerOrderHistory(userId: string): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user || user.role !== "DINER" || !user.storeId) {
    return;
  }

  if (user.phoneE164) {
    try {
      await ensureCustomerForDiner({
        userId: user.id,
        storeId: user.storeId,
        name: user.name,
        phoneE164: user.phoneE164,
      });
      return;
    } catch (error) {
      logger.warn("diner.sync_order_history.ensure_failed", {
        userId: user.id,
        error,
      });
    }
  }

  await orderRepository.claimGuestOrdersForUser({
    userId: user.id,
    storeId: user.storeId,
    customerId: user.customerId,
    email: user.email,
  });
}
