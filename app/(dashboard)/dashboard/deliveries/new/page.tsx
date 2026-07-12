import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardPage, DashboardPageBody, PageHeader } from "../../layout";
import { DeliveryForm } from "@/components/features/deliveries/delivery-form";

export const metadata: Metadata = {
  title: "New delivery",
};

export default async function NewDeliveryPage() {
  return (
    <DashboardPage>
      <PageHeader
        title="New delivery"
        description="Send an order from your store to a customer."
      />
      <DashboardPageBody>
        <Suspense fallback={null}>
          <DeliveryForm />
        </Suspense>
      </DashboardPageBody>
    </DashboardPage>
  );
}
