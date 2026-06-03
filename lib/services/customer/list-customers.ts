import { requireStoreManager } from "@/lib/auth/session";
import {
  customerRepository,
  mapCustomerToListItem,
} from "@/lib/db/repositories/customer.repository";
import type { CustomerListItem } from "@/lib/domain/customer/types";

export type ListCustomersResult = {
  items: CustomerListItem[];
  search: string;
};

export async function listCustomers(input: {
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ListCustomersResult> {
  const user = await requireStoreManager();
  const search = input.search?.trim() ?? "";

  const customers = await customerRepository.findManyForStore({
    storeId: user.storeId,
    search: search || undefined,
    limit: input.limit,
    offset: input.offset,
  });

  return {
    items: customers.map(mapCustomerToListItem),
    search,
  };
}
