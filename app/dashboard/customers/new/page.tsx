import { DashboardPage, DashboardPageBody, PageHeader } from "../../layout";
import { CustomerForm } from "@/components/features/customers/customer-form";

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
