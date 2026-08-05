import { requireStoreManager } from "@/lib/auth/session";
import {
  mapOrderToStaffDetail,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import { syncDeliveryFromProvider } from "@/lib/services/delivery/sync-from-provider";
import { AppError } from "@/lib/utils/errors";

export async function getStaffOrder(orderId: string): Promise<StaffOrderDetail> {
  const user = await requireStoreManager();
  let order = await orderRepository.findByIdForStore(orderId, user.storeId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  if (order.delivery) {
    await syncDeliveryFromProvider(order.delivery);
    order = await orderRepository.findByIdForStore(orderId, user.storeId);
    if (!order) {
      throw new AppError("NOT_FOUND", "Order not found.", 404);
    }
  }

  return mapOrderToStaffDetail(order);
}
