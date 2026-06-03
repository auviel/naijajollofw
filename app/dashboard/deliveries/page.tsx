import { Suspense } from "react";
import { DashboardPage, DashboardPageBody, PageHeader, PrimaryLink } from "../layout";
import { DeliveryListEmpty } from "@/components/features/deliveries/delivery-list";
import { DeliveryListFilters } from "@/components/features/deliveries/delivery-list-filters";
import { DeliveryListRefresh } from "@/components/features/deliveries/delivery-list-refresh";
import { DeliveryList } from "@/components/features/deliveries/delivery-list";
import { listDeliveries } from "@/lib/services/delivery/list-deliveries";
import { shouldPollDeliveries } from "@/lib/domain/delivery/filters";

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
          <>
            <DeliveryListRefresh enabled={shouldPollDeliveries(filter)} />
            <DeliveryList items={items} />
          </>
        )}
      </DashboardPageBody>
    </DashboardPage>
  );
}
