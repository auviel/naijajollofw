import Link from "next/link";
import { DashboardPage, DashboardPageBody, PageHeader } from "../../layout";
import { OrderDetailView } from "@/components/features/orders/order-detail-view";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import { getStaffOrder } from "@/lib/services/order/get-staff-order";
import { isAppError } from "@/lib/utils/errors";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  let order: StaffOrderDetail | null = null;
  let errorMessage: string | null = null;

  try {
    order = await getStaffOrder(id);
  } catch (error) {
    errorMessage = isAppError(error) ? error.message : "Unable to load order.";
  }

  if (!order) {
    return (
      <DashboardPage>
        <PageHeader title="Order" description={errorMessage ?? "Not found"} />
        <DashboardPageBody>
          <Link href="/dashboard/orders" className="text-sm font-medium text-accent">
            Back to orders
          </Link>
        </DashboardPageBody>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <PageHeader
        title={order.customerName}
        description={`Order · ${order.itemCount} item${order.itemCount === 1 ? "" : "s"}`}
        action={
          <Link
            href="/dashboard"
            className="text-sm font-medium text-text-secondary hover:text-foreground"
          >
            ← Board
          </Link>
        }
      />
      <DashboardPageBody>
        <OrderDetailView order={order} />
      </DashboardPageBody>
    </DashboardPage>
  );
}
