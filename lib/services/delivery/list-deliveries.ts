import { requireStoreManager } from "@/lib/auth/session";
import {
  deliveryRepository,
  mapDeliveryToListItem,
} from "@/lib/db/repositories/delivery.repository";
import {
  parseDeliveryListFilter,
  shouldPollDeliveries,
  type DeliveryListFilter,
} from "@/lib/domain/delivery/filters";
import type { DeliveryListItem } from "@/lib/domain/delivery/types";
import { syncActiveDeliveriesForStore } from "@/lib/services/delivery/sync-active-deliveries";

export type ListDeliveriesInput = {
  filter?: DeliveryListFilter | string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type ListDeliveriesResult = {
  items: DeliveryListItem[];
  filter: DeliveryListFilter;
  search: string;
};

export async function listDeliveries(
  input: ListDeliveriesInput = {},
): Promise<ListDeliveriesResult> {
  const user = await requireStoreManager();
  const filter = parseDeliveryListFilter(
    typeof input.filter === "string" ? input.filter : input.filter,
  );
  const search = input.search?.trim() ?? "";

  if (shouldPollDeliveries(filter)) {
    await syncActiveDeliveriesForStore(user.storeId);
  }

  const deliveries = await deliveryRepository.findManyForStore({
    storeId: user.storeId,
    filter,
    search: search || undefined,
    limit: input.limit,
    offset: input.offset,
  });

  return {
    items: deliveries.map(mapDeliveryToListItem),
    filter,
    search,
  };
}
