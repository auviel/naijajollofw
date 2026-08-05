import type { Metadata } from "next";
import Link from "next/link";
import {
  DashboardPage,
  DashboardPageBody,
} from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { KitchenBoard } from "@/components/features/orders/kitchen-board";
import { List } from "@/components/ui/icons";
import { listStaffOrders } from "@/lib/services/order/list-staff-orders";

export const metadata: Metadata = {
  title: "Kitchen board",
};

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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-foreground hover:underline"
          >
            <List className="h-4 w-4" aria-hidden />
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
