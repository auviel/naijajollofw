import { deliveryRepository } from "@/lib/db/repositories/delivery.repository";
import { syncDeliveryFromProvider } from "@/lib/services/delivery/sync-from-provider";

/** Pull latest status from Uber for in-progress deliveries belonging to a store. */
export async function syncActiveDeliveriesForStore(storeId: string): Promise<void> {
  const deliveries = await deliveryRepository.findManyForStore({
    storeId,
    filter: "active",
    limit: 50,
  });

  if (deliveries.length === 0) {
    return;
  }

  await Promise.all(deliveries.map((delivery) => syncDeliveryFromProvider(delivery)));
}
