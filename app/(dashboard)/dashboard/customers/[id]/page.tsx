import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DashboardPage,
  DashboardPageBody,
} from "@/components/layout/dashboard-page";
import { CustomerDetailView } from "@/components/features/customers/customer-detail-view";
import { requireStoreManager } from "@/lib/auth/session";
import {
  orderRepository,
  toStaffListItems,
} from "@/lib/db/repositories/order.repository";
import { getCustomer } from "@/lib/services/customer/get-customer";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: CustomerDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const customer = await getCustomer(id);
    return { title: customer.name };
  } catch {
    return { title: "Customer" };
  }
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = await params;
  const user = await requireStoreManager();

  let customer;
  try {
    customer = await getCustomer(id);
  } catch {
    notFound();
  }

  const orders = await orderRepository.findManyForCustomer(
    id,
    user.storeId,
    20,
  );
  const recentOrders = await toStaffListItems(orders);

  return (
    <DashboardPage>
      <DashboardPageBody>
        <CustomerDetailView
          customer={customer}
          recentOrders={recentOrders}
        />
      </DashboardPageBody>
    </DashboardPage>
  );
}
