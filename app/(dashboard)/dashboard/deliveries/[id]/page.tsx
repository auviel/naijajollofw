import { notFound } from "next/navigation";
import { DashboardPage, DashboardPageBody } from "../../layout";
import { DeliveryDetailLive } from "@/components/features/deliveries/delivery-detail-live";
import { getDelivery } from "@/lib/services/delivery/get-delivery";
import { isAppError } from "@/lib/utils/errors";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DeliveryDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const delivery = await getDelivery(id);

    return (
      <DashboardPage>
        <DashboardPageBody>
          <DeliveryDetailLive initialDelivery={delivery} />
        </DashboardPageBody>
      </DashboardPage>
    );
  } catch (error) {
    if (isAppError(error) && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
