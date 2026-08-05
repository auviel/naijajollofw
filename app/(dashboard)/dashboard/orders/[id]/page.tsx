import type { Metadata } from "next";
import Link from "next/link";
import {
  DashboardPage,
  DashboardPageBody,
} from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { OrderDetailView } from "@/components/features/orders/order-detail-view";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import { getStaffOrder } from "@/lib/services/order/get-staff-order";
import { isAppError } from "@/lib/utils/errors";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const order = await getStaffOrder(id);
    return {
      title: order.displayNumber
        ? `${order.displayNumber} · ${order.customerName}`
        : `Order · ${order.customerName}`,
    };
  } catch {
    return { title: "Order" };
  }
}

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
      <DashboardPageBody>
        <OrderDetailView order={order} />
      </DashboardPageBody>
    </DashboardPage>
  );
}
