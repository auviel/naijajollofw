import { Suspense } from "react";
import { ClipboardList } from "@/components/ui/icons";
import {
  DashboardPage,
  DashboardPageBody,
  PageHeader,
  PrimaryLink,
} from "../layout";
import { OrderList, OrderListFilters } from "@/components/features/orders/order-list";
import { EmptyState } from "@/components/ui/empty-state";
import { listStaffOrders } from "@/lib/services/order/list-staff-orders";

type PageProps = {
  searchParams: Promise<{ filter?: string; channel?: string; q?: string }>;
};

export default async function OrdersListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isCourier = params.channel === "courier";
  const { items, filter, channel, search } = await listStaffOrders({
    filter: params.filter ?? (isCourier ? "all" : undefined),
    channel: params.channel,
    search: params.q,
    limit: 100,
  });

  return (
    <DashboardPage>
      <PageHeader
        title={isCourier ? "Courier orders" : "All orders"}
        description={
          isCourier
            ? "Manual and carrier deliveries linked to restaurant orders."
            : "Kitchen and courier jobs in one list."
        }
        action={
          isCourier ? (
            <PrimaryLink href="/dashboard/deliveries/new">
              New delivery
            </PrimaryLink>
          ) : undefined
        }
      />
      <Suspense fallback={null}>
        <OrderListFilters filter={filter} channel={channel} search={search} />
      </Suspense>
      <DashboardPageBody>
        {items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" aria-hidden />}
            title={isCourier ? "No courier jobs" : "No orders"}
            description={
              search
                ? "Nothing matched that search."
                : isCourier
                  ? "Dispatch a delivery or fulfill an order to see it here."
                  : "Orders show up here after checkout or courier dispatch."
            }
            action={
              isCourier && !search ? (
                <PrimaryLink href="/dashboard/deliveries/new">
                  New delivery
                </PrimaryLink>
              ) : undefined
            }
          />
        ) : (
          <OrderList items={items} />
        )}
      </DashboardPageBody>
    </DashboardPage>
  );
}
