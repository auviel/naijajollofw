import { DashboardPage, DashboardPageBody } from "@/components/layout/dashboard-page";
import { NotFoundPanel } from "@/components/layout/not-found-panel";

export default function DashboardNotFound() {
  return (
    <DashboardPage>
      <DashboardPageBody centered>
        <NotFoundPanel
          title="Page not found"
          description="This page doesn't exist or you don't have access to it."
          primaryAction={{ href: "/dashboard", label: "Back to dashboard" }}
          secondaryAction={{ href: "/dashboard/orders", label: "View orders" }}
        />
      </DashboardPageBody>
    </DashboardPage>
  );
}
