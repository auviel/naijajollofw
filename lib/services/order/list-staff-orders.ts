import { requireStoreManager } from "@/lib/auth/session";
import {
  orderRepository,
  toStaffListItems,
} from "@/lib/db/repositories/order.repository";
import { storeRepository } from "@/lib/db/repositories/store.repository";
import { kitchenBoardDueBy } from "@/lib/domain/order/kitchen-schedule";
import type { StaffOrderListItem } from "@/lib/domain/order/types";
import {
  parseStaffOrderChannel,
  parseStaffOrderListFilter,
  statusesForStaffFilter,
  type StaffOrderChannel,
  type StaffOrderListFilter,
} from "@/lib/domain/order/transitions";

export type ListStaffOrdersInput = {
  filter?: string;
  channel?: string;
  search?: string;
  limit?: number;
};

export type ListStaffOrdersResult = {
  items: StaffOrderListItem[];
  filter: StaffOrderListFilter;
  channel: StaffOrderChannel;
  search: string;
  pendingAcceptanceCount: number;
  prepMinutes: number;
};

export async function listStaffOrders(
  input: ListStaffOrdersInput = {},
): Promise<ListStaffOrdersResult> {
  const user = await requireStoreManager();
  const filter = parseStaffOrderListFilter(input.filter);
  const channel = parseStaffOrderChannel(input.channel);
  const search = input.search?.trim() ?? "";
  const statuses = statusesForStaffFilter(filter);
  // Kitchen board / active view should never mix in courier-only jobs.
  const effectiveChannel =
    filter === "active" && channel === "all" ? "kitchen" : channel;

  const [orders, store] = await Promise.all([
    orderRepository.findManyForStore({
      storeId: user.storeId,
      statuses,
      search: search || undefined,
      limit: input.limit,
      channel: effectiveChannel,
    }),
    storeRepository.findById(user.storeId),
  ]);
  const prepMinutes = store?.prepMinutes ?? 15;
  const pendingAcceptanceCount = await orderRepository.countForStore(
    user.storeId,
    ["pending_acceptance"],
    "kitchen",
    { scheduledDueBy: kitchenBoardDueBy(prepMinutes) },
  );

  return {
    items: await toStaffListItems(orders),
    filter,
    channel: effectiveChannel,
    search,
    pendingAcceptanceCount,
    prepMinutes,
  };
}
