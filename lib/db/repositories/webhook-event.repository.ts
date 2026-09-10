import type { Prisma } from "@/generated/prisma-node/client";
import { prisma } from "@/lib/db/client";

export type CreateWebhookEventData = {
  eventId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  deliveryId?: string;
};

export const webhookEventRepository = {
  async findByEventId(eventId: string) {
    return prisma.webhookEvent.findUnique({ where: { eventId } });
  },

  async create(data: CreateWebhookEventData) {
    return prisma.webhookEvent.create({ data });
  },

  /** Returns existing event if already processed (idempotency). */
  async createIfNotExists(data: CreateWebhookEventData) {
    const existing = await this.findByEventId(data.eventId);
    if (existing) {
      return { event: existing, created: false as const };
    }

    try {
      const event = await this.create(data);
      return { event, created: true as const };
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        const duplicate = await this.findByEventId(data.eventId);
        if (duplicate) {
          return { event: duplicate, created: false as const };
        }
      }
      throw error;
    }
  },

  async markProcessed(id: string, deliveryId?: string) {
    return prisma.webhookEvent.update({
      where: { id },
      data: {
        processedAt: new Date(),
        ...(deliveryId ? { deliveryId } : {}),
      },
    });
  },
};
