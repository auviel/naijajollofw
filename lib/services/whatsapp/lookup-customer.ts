import {
  customerRepository,
  mapCustomerToDetail,
  mapCustomerToSearchResult,
} from "@/lib/db/repositories/customer.repository";
import type { CustomerDetail } from "@/lib/domain/customer/types";
import type { WhatsAppAddressOption } from "@/lib/domain/whatsapp/types";
import { AppError } from "@/lib/utils/errors";

export type WhatsAppCustomerLookupResult =
  | {
      type: "ready";
      customer: CustomerDetail;
      dropoffPhone: string;
      dropoffAddress: string;
    }
  | {
      type: "multiple_customers";
      options: Array<{ id: string; name: string; phone: string; address: string }>;
    }
  | {
      type: "multiple_addresses";
      customer: CustomerDetail;
      dropoffPhone: string;
      addressOptions: WhatsAppAddressOption[];
    }
  | {
      type: "not_found";
      query: string;
    }
  | {
      type: "incomplete";
      customerName: string;
      reason: string;
    };

function getPrimaryPhone(customer: CustomerDetail): string | null {
  return (
    customer.phones.find((phone) => phone.isPrimary)?.phoneE164 ??
    customer.phones[0]?.phoneE164 ??
    null
  );
}

export async function lookupCustomerForWhatsApp(input: {
  storeId: string;
  query: string;
  customerId?: string;
  addressId?: string;
}): Promise<WhatsAppCustomerLookupResult> {
  if (input.customerId) {
    const customerRecord = await customerRepository.findByIdAndStoreId(
      input.customerId,
      input.storeId,
    );

    if (!customerRecord) {
      throw new AppError("NOT_FOUND", "Customer not found", 404);
    }

    const customer = mapCustomerToDetail(customerRecord);
    return resolveCustomerAddresses(customer, input.addressId);
  }

  const matches = await customerRepository.searchForStore({
    storeId: input.storeId,
    search: input.query,
    limit: 5,
  });

  const readyMatches = matches
    .map(mapCustomerToSearchResult)
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (readyMatches.length === 0) {
    return { type: "not_found", query: input.query };
  }

  if (readyMatches.length > 1) {
    return {
      type: "multiple_customers",
      options: readyMatches.map((match) => ({
        id: match.id,
        name: match.name,
        phone: match.phoneDisplay,
        address: match.addressFormatted,
      })),
    };
  }

  const customerRecord = await customerRepository.findByIdAndStoreId(
    readyMatches[0]!.id,
    input.storeId,
  );

  if (!customerRecord) {
    return { type: "not_found", query: input.query };
  }

  return resolveCustomerAddresses(mapCustomerToDetail(customerRecord), input.addressId);
}

function resolveCustomerAddresses(
  customer: CustomerDetail,
  addressId?: string,
): WhatsAppCustomerLookupResult {
  const dropoffPhone = getPrimaryPhone(customer);
  if (!dropoffPhone) {
    return {
      type: "incomplete",
      customerName: customer.name,
      reason: "Customer has no phone number on file.",
    };
  }

  if (customer.addresses.length === 0) {
    return {
      type: "incomplete",
      customerName: customer.name,
      reason: "Customer has no saved address.",
    };
  }

  if (addressId) {
    const address = customer.addresses.find((item) => item.id === addressId);
    if (!address) {
      return {
        type: "incomplete",
        customerName: customer.name,
        reason: "That address option is no longer available.",
      };
    }

    return {
      type: "ready",
      customer,
      dropoffPhone,
      dropoffAddress: address.formatted,
    };
  }

  if (customer.addresses.length === 1) {
    return {
      type: "ready",
      customer,
      dropoffPhone,
      dropoffAddress: customer.addresses[0]!.formatted,
    };
  }

  return {
    type: "multiple_addresses",
    customer,
    dropoffPhone,
    addressOptions: customer.addresses.map((address) => ({
      id: address.id,
      formatted: address.formatted,
    })),
  };
}
