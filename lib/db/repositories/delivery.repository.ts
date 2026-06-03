import { statusesForFilter, type DeliveryListFilter } from "@/lib/domain/delivery/filters";
import type {
  DeliveryListItem,
  DeliveryProviderId,
  DeliveryRecord,
  DeliveryStatus,
} from "@/lib/domain/delivery/types";
import type { Delivery, DeliveryStatus as PrismaDeliveryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";

export type ProofOfDeliveryData = {
  signatureImageUrl?: string;
  signerName?: string;
  pictureImageUrl?: string;
  pincodeValue?: string;
  fetchedAt?: string;
};

export function mapDeliveryToRecord(delivery: Delivery): DeliveryRecord {
  return {
    id: delivery.id,
    externalId: delivery.externalId,
    storeId: delivery.storeId,
    providerId: delivery.providerId as DeliveryProviderId,
    providerDeliveryId: delivery.providerDeliveryId ?? "",
    status: delivery.status as DeliveryStatus,
    feeCents: delivery.feeCents ?? 0,
    currency: delivery.currency,
    trackingUrl: delivery.trackingUrl ?? "",
    liveMode: delivery.liveMode,
    createdAt: delivery.createdAt,
  };
}

export type CreateDeliveryData = {
  externalId: string;
  storeId: string;
  providerId?: string;
  quoteId?: string;
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffName: string;
  dropoffPhone: string;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  feeCents?: number;
  currency?: string;
  status?: PrismaDeliveryStatus;
  trackingUrl?: string;
  pickupReadyAt?: Date;
  scheduledFor?: Date;
  podSignature?: boolean;
  podPicture?: boolean;
  podPincode?: boolean;
  liveMode?: boolean;
  providerDeliveryId?: string;
  providerOrderId?: string;
  providerPayload?: Prisma.InputJsonValue;
};

export type UpdateDeliveryData = Partial<
  Omit<CreateDeliveryData, "externalId" | "storeId">
> & {
  proofOfDelivery?: ProofOfDeliveryData;
  cancelledAt?: Date | null;
  cancelReason?: string | null;
  cancelledBy?: string | null;
};

export function mapDeliveryToListItem(delivery: Delivery): DeliveryListItem {
  return {
    id: delivery.id,
    externalId: delivery.externalId,
    dropoffName: delivery.dropoffName,
    dropoffAddress: delivery.dropoffAddress,
    status: delivery.status as DeliveryStatus,
    feeCents: delivery.feeCents,
    currency: delivery.currency,
    createdAt: delivery.createdAt,
    scheduledFor: delivery.scheduledFor,
  };
}

export type DeliveryListQuery = {
  storeId: string;
  filter?: DeliveryListFilter;
  search?: string;
  limit?: number;
  offset?: number;
};

export const deliveryRepository = {
  async findManyForStore(query: DeliveryListQuery): Promise<Delivery[]> {
    const statuses = query.filter ? statusesForFilter(query.filter) : undefined;
    const search = query.search?.trim();

    return prisma.delivery.findMany({
      where: {
        storeId: query.storeId,
        ...(statuses ? { status: { in: statuses as PrismaDeliveryStatus[] } } : {}),
        ...(search
          ? {
              OR: [
                { dropoffName: { contains: search, mode: "insensitive" } },
                { externalId: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
    });
  },

  async findManyByStoreId(
    storeId: string,
    options?: { status?: PrismaDeliveryStatus; limit?: number },
  ): Promise<Delivery[]> {
    return prisma.delivery.findMany({
      where: {
        storeId,
        ...(options?.status ? { status: options.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit,
    });
  },

  async findByIdAndStoreId(id: string, storeId: string): Promise<Delivery | null> {
    return prisma.delivery.findFirst({
      where: { id, storeId },
    });
  },

  async findByExternalId(externalId: string): Promise<Delivery | null> {
    return prisma.delivery.findUnique({
      where: { externalId },
    });
  },

  async findByProviderDeliveryId(providerDeliveryId: string): Promise<Delivery | null> {
    return prisma.delivery.findFirst({
      where: { providerDeliveryId },
    });
  },

  async findByProviderOrderId(providerOrderId: string): Promise<Delivery | null> {
    return prisma.delivery.findFirst({
      where: { providerOrderId },
    });
  },

  async create(data: CreateDeliveryData): Promise<Delivery> {
    return prisma.delivery.create({ data });
  },

  async update(id: string, storeId: string, data: UpdateDeliveryData): Promise<Delivery> {
    const existing = await this.findByIdAndStoreId(id, storeId);
    if (!existing) {
      throw new Error(`Delivery not found: ${id}`);
    }

    const { proofOfDelivery, ...rest } = data;

    return prisma.delivery.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...(proofOfDelivery !== undefined
          ? { proofOfDelivery: proofOfDelivery as Prisma.InputJsonValue }
          : {}),
      },
    });
  },
};
