import { requireStoreManager } from "@/lib/auth/session";
import {
  customerRepository,
  mapCustomerToSearchResult,
} from "@/lib/db/repositories/customer.repository";
import type { CustomerSearchResult } from "@/lib/domain/customer/types";

export async function searchCustomers(input: {
  search: string;
  limit?: number;
}): Promise<CustomerSearchResult[]> {
  const user = await requireStoreManager();

  const customers = await customerRepository.searchForStore({
    storeId: user.storeId,
    search: input.search,
    limit: input.limit,
  });

  return customers
    .map(mapCustomerToSearchResult)
    .filter((item): item is CustomerSearchResult => item !== null);
}
