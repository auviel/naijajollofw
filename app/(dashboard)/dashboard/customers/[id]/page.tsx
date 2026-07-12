import { notFound } from "next/navigation";
import { DashboardPage, DashboardPageBody } from "../../layout";
import { CustomerDetailView } from "@/components/features/customers/customer-detail-view";
import { getCustomer } from "@/lib/services/customer/get-customer";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;

  let customer;
  try {
    customer = await getCustomer(id);
  } catch {
    notFound();
  }

  return (
    <DashboardPage>
      <DashboardPageBody>
        <CustomerDetailView customer={customer} />
      </DashboardPageBody>
    </DashboardPage>
  );
}
