import { requireStoreManager } from "@/lib/auth/session";
import {
  mapOrderToStaffListItem,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import type { StaffOrderListItem } from "@/lib/domain/order/types";
import {
  parseStaffOrderListFilter,
  statusesForStaffFilter,
  type StaffOrderListFilter,
} from "@/lib/domain/order/transitions";

export type ListStaffOrdersInput = {
  filter?: string;
  search?: string;
  limit?: number;
};

export type ListStaffOrdersResult = {
  items: StaffOrderListItem[];
  filter: StaffOrderListFilter;
  search: string;
  pendingAcceptanceCount: number;
};

export async function listStaffOrders(
  input: ListStaffOrdersInput = {},
): Promise<ListStaffOrdersResult> {
  const user = await requireStoreManager();
  const filter = parseStaffOrderListFilter(input.filter);
  const search = input.search?.trim() ?? "";
  const statuses = statusesForStaffFilter(filter);

  const [orders, pendingAcceptanceCount] = await Promise.all([
    orderRepository.findManyForStore({
      storeId: user.storeId,
      statuses,
      search: search || undefined,
      limit: input.limit,
    }),
    orderRepository.countForStore(user.storeId, ["pending_acceptance"]),
  ]);

  return {
    items: orders.map(mapOrderToStaffListItem),
    filter,
    search,
    pendingAcceptanceCount,
  };
}
