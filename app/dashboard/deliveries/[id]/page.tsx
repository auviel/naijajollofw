import { notFound } from "next/navigation";
import { DashboardPage, DashboardPageBody, PageHeader } from "../../layout";
import { DeliveryDetailView } from "@/components/features/deliveries/delivery-detail-view";
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
        <PageHeader
          title={delivery.dropoff.name}
          description={`Delivery to ${delivery.dropoff.address}`}
        />
        <DashboardPageBody>
          <DeliveryDetailView delivery={delivery} />
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
