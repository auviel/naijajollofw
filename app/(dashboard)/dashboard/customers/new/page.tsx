import type { Metadata } from "next";
import {
  DashboardPage,
  DashboardPageBody,
} from "@/components/layout/dashboard-page";
import { CustomerForm } from "@/components/features/customers/customer-form";

export const metadata: Metadata = {
  title: "New customer",
};

export default function NewCustomerPage() {
  return (
    <DashboardPage>
      <DashboardPageBody>
        <CustomerForm />
      </DashboardPageBody>
    </DashboardPage>
  );
}
