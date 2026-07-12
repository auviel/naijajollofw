import { Suspense } from "react";
import { ClipboardList } from "@/components/ui/icons";
import { DashboardPage, DashboardPageBody, PageHeader } from "../layout";
import { OrderList, OrderListFilters } from "@/components/features/orders/order-list";
import { EmptyState } from "@/components/ui/empty-state";
import { listStaffOrders } from "@/lib/services/order/list-staff-orders";

type PageProps = {
  searchParams: Promise<{ filter?: string; channel?: string; q?: string }>;
};

export default async function OrdersListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { items, filter, channel, search } = await listStaffOrders({
    filter: params.filter ?? (params.channel === "courier" ? "all" : undefined),
    channel: params.channel,
    search: params.q,
    limit: 100,
  });

  return (
    <DashboardPage>
      <PageHeader
        title="All orders"
        description="Kitchen and courier jobs in one list."
      />
      <Suspense fallback={null}>
        <OrderListFilters filter={filter} channel={channel} search={search} />
      </Suspense>
      <DashboardPageBody>
        {items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" aria-hidden />}
            title="No orders"
            description={
              search
                ? "Nothing matched that search."
                : "Orders show up here after checkout or courier dispatch."
            }
          />
        ) : (
          <OrderList items={items} />
        )}
      </DashboardPageBody>
    </DashboardPage>
  );
}
