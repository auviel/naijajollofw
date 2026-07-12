import { Suspense } from "react";
import { DashboardPage, DashboardPageBody, PageHeader, PrimaryLink } from "../layout";
import { DeliveryListEmpty } from "@/components/features/deliveries/delivery-list";
import { DeliveryListFilters } from "@/components/features/deliveries/delivery-list-filters";
import { DeliveryListLive } from "@/components/features/deliveries/delivery-list-live";
import { listDeliveries } from "@/lib/services/delivery/list-deliveries";

type DeliveriesPageProps = {
  searchParams: Promise<{
    filter?: string;
    q?: string;
  }>;
};

export default async function DeliveriesPage({ searchParams }: DeliveriesPageProps) {
  const params = await searchParams;
  const { items, filter, search } = await listDeliveries({
    filter: params.filter,
    search: params.q,
  });

  return (
    <DashboardPage>
      <PageHeader
        title="Deliveries"
        action={<PrimaryLink href="/dashboard/deliveries/new">New delivery</PrimaryLink>}
      />

      <Suspense fallback={null}>
        <DeliveryListFilters filter={filter} search={search} />
      </Suspense>

      <DashboardPageBody>
        {items.length === 0 ? (
          <DeliveryListEmpty hasSearch={Boolean(search)} filter={filter} />
        ) : (
          <DeliveryListLive initialItems={items} filter={filter} search={search} />
        )}
      </DashboardPageBody>
    </DashboardPage>
  );
}
