import {
  mapOrderToPublicView,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import type { PublicOrderView } from "@/lib/domain/order/types";
import { AppError } from "@/lib/utils/errors";

export async function getPublicOrder(
  orderId: string,
  publicToken: string,
): Promise<PublicOrderView> {
  const token = publicToken.trim();
  if (!token) {
    throw new AppError("UNAUTHORIZED", "Order token is required.", 401);
  }

  const order = await orderRepository.findByIdWithPublicToken(orderId, token);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  return mapOrderToPublicView(order);
}
