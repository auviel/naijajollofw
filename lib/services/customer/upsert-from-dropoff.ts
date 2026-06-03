import type { NormalizedAddress } from "@/lib/domain/address/types";
import { customerRepository } from "@/lib/db/repositories/customer.repository";

export async function upsertCustomerFromDropoff(input: {
  storeId: string;
  name: string;
  phoneE164: string;
  address: NormalizedAddress;
}): Promise<string> {
  const customer = await customerRepository.upsertFromDropoff(input);
  return customer.id;
}
