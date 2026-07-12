import type { DeliveryStatus, OrderSource } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { customerRepository } from "@/lib/db/repositories/customer.repository";
import { orderRepository } from "@/lib/db/repositories/order.repository";
import { logger } from "@/lib/utils/logger";

function mapSource(source: string): OrderSource {
  if (source === "whatsapp") return "whatsapp";
  if (source === "order") return "storefront";
  return "dashboard";
}

/**
 * Create thin Orders for Deliveries that are not yet linked.
 * Safe to run multiple times (skips deliveries that already have an Order).
 */
export async function backfillOrphanDeliveries(): Promise<{
  created: number;
  skipped: number;
}> {
  const orphans = await prisma.delivery.findMany({
    where: {
      restaurantOrder: null,
    },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  let skipped = 0;

  for (const delivery of orphans) {
    let customerId = delivery.customerId;

    if (!customerId) {
      const byPhone = await customerRepository.findByPhone(
        delivery.storeId,
        delivery.dropoffPhone,
      );
      if (byPhone) {
        customerId = byPhone.id;
      } else {
        try {
          const customer = await customerRepository.createFromContact({
            storeId: delivery.storeId,
            name: delivery.dropoffName,
            phoneE164: delivery.dropoffPhone,
          });
          customerId = customer.id;
        } catch (error) {
          skipped += 1;
          logger.warn("order.backfill.skip_no_customer", {
            deliveryId: delivery.id,
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
      }
      await prisma.delivery.update({
        where: { id: delivery.id },
        data: { customerId },
      });
    }

    const source = mapSource(delivery.source);
    await orderRepository.createCourierOrder({
      storeId: delivery.storeId,
      customerId,
      source: source === "storefront" ? "dashboard" : source,
      customerName: delivery.dropoffName,
      customerPhone: delivery.dropoffPhone,
      dropoffAddress: delivery.dropoffAddress,
      dropoffLat: delivery.dropoffLat,
      dropoffLng: delivery.dropoffLng,
      deliveryId: delivery.id,
      deliveryStatus: delivery.status as DeliveryStatus,
      actor: "backfill",
    });
    created += 1;
  }

  logger.info("order.backfill.orphan_deliveries", { created, skipped });
  return { created, skipped };
}
