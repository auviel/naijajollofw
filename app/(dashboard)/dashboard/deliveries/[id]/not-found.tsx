import Link from "next/link";
import { DashboardPage, DashboardPageBody } from "@/components/layout/dashboard-page";

export default function DeliveryNotFound() {
  return (
    <DashboardPage>
      <DashboardPageBody centered>
        <div className="w-full max-w-lg rounded-lg border border-border bg-surface-elevated p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">Delivery not found</h1>
          <p className="mt-2 text-sm text-text-secondary">
            This delivery does not exist or you do not have access to it.
          </p>
          <Link
            href="/dashboard/deliveries"
            className="mt-6 inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to deliveries
          </Link>
        </div>
      </DashboardPageBody>
    </DashboardPage>
  );
}
