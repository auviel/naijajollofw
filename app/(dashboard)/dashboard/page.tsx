import Link from "next/link";
import { DashboardPage, DashboardPageBody, PageHeader } from "./layout";
import { KitchenBoard } from "@/components/features/orders/kitchen-board";
import { listStaffOrders } from "@/lib/services/order/list-staff-orders";

export default async function DashboardHomePage() {
  const { items, pendingAcceptanceCount } = await listStaffOrders({
    filter: "active",
    channel: "kitchen",
    limit: 80,
  });

  return (
    <DashboardPage>
      <PageHeader
        title="Kitchen board"
        description={
          pendingAcceptanceCount > 0
            ? `${pendingAcceptanceCount} order${pendingAcceptanceCount === 1 ? "" : "s"} waiting for accept`
            : "Live orders — polls every few seconds"
        }
        action={
          <Link
            href="/dashboard/orders"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground"
          >
            All orders
          </Link>
        }
      />
      <DashboardPageBody>
        <KitchenBoard
          initialItems={items}
          initialPendingCount={pendingAcceptanceCount}
        />
      </DashboardPageBody>
    </DashboardPage>
  );
}
