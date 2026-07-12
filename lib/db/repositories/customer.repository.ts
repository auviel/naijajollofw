import type {
  Customer,
  CustomerAddress,
  CustomerPhone,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { NormalizedAddress } from "@/lib/domain/address/types";
import {
  addressesMatch,
  namesMatch,
  normalizePostalCode,
} from "@/lib/domain/customer/matching";
import { formatPhoneForDisplay } from "@/lib/domain/customer/format";
import type {
  CustomerDetail,
  CustomerListItem,
  CustomerSearchResult,
} from "@/lib/domain/customer/types";

type CustomerWithRelations = Customer & {
  phones: CustomerPhone[];
  addresses: CustomerAddress[];
  _count: { deliveries: number; orders: number };
};

const customerInclude = {
  phones: {
    orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
  },
  addresses: {
    orderBy: [{ isPrimary: "desc" as const }, { updatedAt: "desc" as const }],
  },
  _count: { select: { deliveries: true, orders: true } },
} satisfies Prisma.CustomerInclude;

function pickPrimaryPhone(phones: CustomerPhone[]): CustomerPhone | null {
  return phones.find((phone) => phone.isPrimary) ?? phones[0] ?? null;
}

function pickPrimaryAddress(addresses: CustomerAddress[]): CustomerAddress | null {
  return addresses.find((address) => address.isPrimary) ?? addresses[0] ?? null;
}

export function mapCustomerToListItem(customer: CustomerWithRelations): CustomerListItem {
  const primaryPhone = pickPrimaryPhone(customer.phones);
  const primaryAddress = pickPrimaryAddress(customer.addresses);

  return {
    id: customer.id,
    name: customer.name,
    primaryPhone: primaryPhone ? formatPhoneForDisplay(primaryPhone.phoneE164) : null,
    primaryAddress: primaryAddress?.formatted ?? null,
    phoneCount: customer.phones.length,
    addressCount: customer.addresses.length,
    deliveryCount: customer._count.deliveries,
    orderCount: customer._count.orders,
    updatedAt: customer.updatedAt,
  };
}

export function mapCustomerToDetail(customer: CustomerWithRelations): CustomerDetail {
  return {
    id: customer.id,
    name: customer.name,
    notes: customer.notes,
    phones: customer.phones.map((phone) => ({
      id: phone.id,
      phoneE164: phone.phoneE164,
      label: phone.label,
      isPrimary: phone.isPrimary,
      createdAt: phone.createdAt,
    })),
    addresses: customer.addresses.map((address) => ({
      id: address.id,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
      formatted: address.formatted,
      label: address.label,
      isPrimary: address.isPrimary,
      createdAt: address.createdAt,
    })),
    deliveryCount: customer._count.deliveries,
    orderCount: customer._count.orders,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

export function mapCustomerToSearchResult(
  customer: CustomerWithRelations,
): CustomerSearchResult | null {
  const phone = pickPrimaryPhone(customer.phones);
  const address = pickPrimaryAddress(customer.addresses);

  if (!phone || !address) {
    return null;
  }

  return {
    id: customer.id,
    name: customer.name,
    phoneE164: phone.phoneE164,
    phoneDisplay: formatPhoneForDisplay(phone.phoneE164),
    addressFormatted: address.formatted,
    addressLine1: address.line1,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
  };
}

function hasMatchingAddress(
  addresses: CustomerAddress[],
  address: NormalizedAddress,
): boolean {
  return addresses.some((existing) =>
    addressesMatch(existing, address),
  );
}

export type UpsertCustomerFromDropoffInput = {
  storeId: string;
  name: string;
  phoneE164: string;
  address: NormalizedAddress;
};

export const customerRepository = {
  async findManyForStore(query: {
    storeId: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<CustomerWithRelations[]> {
    const search = query.search?.trim();

    return prisma.customer.findMany({
      where: {
        storeId: query.storeId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                {
                  phones: {
                    some: {
                      phoneE164: { contains: search.replace(/\D/g, ""), mode: "insensitive" },
                    },
                  },
                },
                {
                  addresses: {
                    some: {
                      formatted: { contains: search, mode: "insensitive" },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: customerInclude,
      orderBy: { updatedAt: "desc" },
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
    });
  },

  async searchForStore(query: {
    storeId: string;
    search: string;
    limit?: number;
  }): Promise<CustomerWithRelations[]> {
    const trimmed = query.search.trim();

    return prisma.customer.findMany({
      where: {
        storeId: query.storeId,
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          {
            phones: {
              some: {
                phoneE164: { contains: trimmed.replace(/\D/g, ""), mode: "insensitive" },
              },
            },
          },
        ],
      },
      include: customerInclude,
      orderBy: { updatedAt: "desc" },
      take: query.limit ?? 8,
    });
  },

  async findByIdAndStoreId(
    id: string,
    storeId: string,
  ): Promise<CustomerWithRelations | null> {
    return prisma.customer.findFirst({
      where: { id, storeId },
      include: customerInclude,
    });
  },

  async findByPhone(
    storeId: string,
    phoneE164: string,
  ): Promise<CustomerWithRelations | null> {
    const phone = await prisma.customerPhone.findUnique({
      where: {
        storeId_phoneE164: { storeId, phoneE164 },
      },
      include: {
        customer: { include: customerInclude },
      },
    });

    return phone?.customer ?? null;
  },

  async findBySimilarNameAndAddress(
    storeId: string,
    name: string,
    address: NormalizedAddress,
  ): Promise<CustomerWithRelations | null> {
    const candidates = await prisma.customer.findMany({
      where: {
        storeId,
        addresses: {
          some: {
            postalCode: {
              equals: normalizePostalCode(address.postalCode),
              mode: "insensitive",
            },
          },
        },
      },
      include: customerInclude,
      take: 20,
    });

    return (
      candidates.find(
        (customer) =>
          namesMatch(customer.name, name) &&
          customer.addresses.some((existing) => addressesMatch(existing, address)),
      ) ?? null
    );
  },

  async upsertFromDropoff(
    input: UpsertCustomerFromDropoffInput,
  ): Promise<CustomerWithRelations> {
    const trimmedName = input.name.trim();
    const address = input.address;

    const byPhone = await this.findByPhone(input.storeId, input.phoneE164);
    if (byPhone) {
      return this.mergeContactOntoCustomer(byPhone, {
        name: trimmedName,
        phoneE164: input.phoneE164,
        address,
      });
    }

    const byNameAndAddress = await this.findBySimilarNameAndAddress(
      input.storeId,
      trimmedName,
      address,
    );
    if (byNameAndAddress) {
      return this.mergeContactOntoCustomer(byNameAndAddress, {
        name: trimmedName,
        phoneE164: input.phoneE164,
        address,
        phoneIsSecondary: true,
      });
    }

    return prisma.customer.create({
      data: {
        storeId: input.storeId,
        name: trimmedName,
        phones: {
          create: {
            storeId: input.storeId,
            phoneE164: input.phoneE164,
            isPrimary: true,
          },
        },
        addresses: {
          create: {
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            province: address.province,
            postalCode: address.postalCode,
            country: address.country,
            latitude: address.latitude,
            longitude: address.longitude,
            formatted: address.formatted,
            isPrimary: true,
          },
        },
      },
      include: customerInclude,
    });
  },

  async mergeContactOntoCustomer(
    customer: CustomerWithRelations,
    input: {
      name: string;
      phoneE164: string;
      address: NormalizedAddress;
      phoneIsSecondary?: boolean;
    },
  ): Promise<CustomerWithRelations> {
    const hasPhone = customer.phones.some(
      (phone) => phone.phoneE164 === input.phoneE164,
    );
    const hasAddress = hasMatchingAddress(customer.addresses, input.address);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: input.name,
        ...(hasPhone
          ? {}
          : {
              phones: {
                create: {
                  storeId: customer.storeId,
                  phoneE164: input.phoneE164,
                  isPrimary: !input.phoneIsSecondary && customer.phones.length === 0,
                },
              },
            }),
        ...(hasAddress
          ? {}
          : {
              addresses: {
                create: {
                  line1: input.address.line1,
                  line2: input.address.line2,
                  city: input.address.city,
                  province: input.address.province,
                  postalCode: input.address.postalCode,
                  country: input.address.country,
                  latitude: input.address.latitude,
                  longitude: input.address.longitude,
                  formatted: input.address.formatted,
                  isPrimary: customer.addresses.length === 0,
                },
              },
            }),
      },
    });

    return (await this.findByIdAndStoreId(customer.id, customer.storeId))!;
  },

  async update(
    id: string,
    storeId: string,
    data: { name?: string; notes?: string | null },
  ): Promise<CustomerWithRelations> {
    const existing = await this.findByIdAndStoreId(id, storeId);
    if (!existing) {
      throw new Error(`Customer not found: ${id}`);
    }

    return prisma.customer.update({
      where: { id: existing.id },
      data,
      include: customerInclude,
    });
  },

  async createFromContact(input: {
    storeId: string;
    name: string;
    phoneE164: string;
  }): Promise<CustomerWithRelations> {
    return prisma.customer.create({
      data: {
        storeId: input.storeId,
        name: input.name.trim(),
        phones: {
          create: {
            storeId: input.storeId,
            phoneE164: input.phoneE164,
            isPrimary: true,
          },
        },
      },
      include: customerInclude,
    });
  },

  async listAddresses(customerId: string) {
    return prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    });
  },

  async findAddressForCustomer(id: string, customerId: string) {
    return prisma.customerAddress.findFirst({
      where: { id, customerId },
    });
  },

  async createAddress(
    customerId: string,
    data: {
      line1: string;
      line2?: string | null;
      city: string;
      province: string;
      postalCode: string;
      country?: string;
      latitude?: number | null;
      longitude?: number | null;
      formatted: string;
      label?: string | null;
      isPrimary?: boolean;
    },
  ) {
    const makePrimary = Boolean(data.isPrimary);
    return prisma.$transaction(async (tx) => {
      if (makePrimary) {
        await tx.customerAddress.updateMany({
          where: { customerId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      const count = await tx.customerAddress.count({ where: { customerId } });
      return tx.customerAddress.create({
        data: {
          customerId,
          line1: data.line1,
          line2: data.line2 ?? null,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode,
          country: data.country ?? "CA",
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          formatted: data.formatted,
          label: data.label ?? null,
          isPrimary: makePrimary || count === 0,
        },
      });
    });
  },

  async updateAddress(
    id: string,
    customerId: string,
    data: {
      line1?: string;
      line2?: string | null;
      city?: string;
      province?: string;
      postalCode?: string;
      country?: string;
      latitude?: number | null;
      longitude?: number | null;
      formatted?: string;
      label?: string | null;
      isPrimary?: boolean;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.customerAddress.findFirst({
        where: { id, customerId },
      });
      if (!existing) {
        return null;
      }
      if (data.isPrimary) {
        await tx.customerAddress.updateMany({
          where: { customerId, isPrimary: true, NOT: { id } },
          data: { isPrimary: false },
        });
      }
      return tx.customerAddress.update({
        where: { id },
        data: {
          ...(data.line1 !== undefined ? { line1: data.line1 } : {}),
          ...(data.line2 !== undefined ? { line2: data.line2 } : {}),
          ...(data.city !== undefined ? { city: data.city } : {}),
          ...(data.province !== undefined ? { province: data.province } : {}),
          ...(data.postalCode !== undefined
            ? { postalCode: data.postalCode }
            : {}),
          ...(data.country !== undefined ? { country: data.country } : {}),
          ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
          ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
          ...(data.formatted !== undefined ? { formatted: data.formatted } : {}),
          ...(data.label !== undefined ? { label: data.label } : {}),
          ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
        },
      });
    });
  },

  async deleteAddress(id: string, customerId: string) {
    const existing = await prisma.customerAddress.findFirst({
      where: { id, customerId },
    });
    if (!existing) {
      return null;
    }
    await prisma.customerAddress.delete({ where: { id } });
    if (existing.isPrimary) {
      const next = await prisma.customerAddress.findFirst({
        where: { customerId },
        orderBy: { updatedAt: "desc" },
      });
      if (next) {
        await prisma.customerAddress.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }
    return existing;
  },
};
