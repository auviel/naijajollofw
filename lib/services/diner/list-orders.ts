import { requireDiner } from "@/lib/auth/session";
import {
  mapOrderToPublicView,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import type { PublicOrderView } from "@/lib/domain/order/types";
import { syncDinerOrderHistory } from "@/lib/services/diner/sync-order-history";

export async function listDinerOrders(limit = 50): Promise<PublicOrderView[]> {
  const user = await requireDiner();
  await syncDinerOrderHistory(user.id);
  const orders = await orderRepository.findManyForUser(user.id, limit);
  return orders.map((order) => mapOrderToPublicView(order));
}
