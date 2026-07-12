import type { Metadata } from "next";
import { DashboardPage, DashboardPageBody, PageHeader } from "../../layout";
import { CustomerForm } from "@/components/features/customers/customer-form";

export const metadata: Metadata = {
  title: "New customer",
};

export default function NewCustomerPage() {
  return (
    <DashboardPage>
      <PageHeader
        title="New customer"
        description="Add a customer to your address book."
      />
      <DashboardPageBody>
        <CustomerForm />
      </DashboardPageBody>
    </DashboardPage>
  );
}
