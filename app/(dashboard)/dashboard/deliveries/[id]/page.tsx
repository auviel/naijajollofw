import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardPage, DashboardPageBody } from "../../layout";
import { DeliveryDetailLive } from "@/components/features/deliveries/delivery-detail-live";
import { getDelivery } from "@/lib/services/delivery/get-delivery";
import { isAppError } from "@/lib/utils/errors";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const delivery = await getDelivery(id);
    return {
      title: delivery.dropoff.name
        ? `Delivery · ${delivery.dropoff.name}`
        : "Delivery",
    };
  } catch {
    return { title: "Delivery" };
  }
}

export default async function DeliveryDetailPage({ params }: PageProps) {
  const { id } = await params;

  let delivery;
  try {
    delivery = await getDelivery(id);
  } catch (error) {
    if (isAppError(error) && error.status === 404) {
      notFound();
    }

    throw error;
  }

  return (
    <DashboardPage>
      <DashboardPageBody>
        <DeliveryDetailLive initialDelivery={delivery} />
      </DashboardPageBody>
    </DashboardPage>
  );
}
