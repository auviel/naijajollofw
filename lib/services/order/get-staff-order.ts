import { requireStoreManager } from "@/lib/auth/session";
import {
  mapOrderToStaffDetail,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import { AppError } from "@/lib/utils/errors";

export async function getStaffOrder(orderId: string): Promise<StaffOrderDetail> {
  const user = await requireStoreManager();
  const order = await orderRepository.findByIdForStore(orderId, user.storeId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }
  return mapOrderToStaffDetail(order);
}
