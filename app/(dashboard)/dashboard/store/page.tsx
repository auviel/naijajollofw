import { DashboardPage, DashboardPageBody, PageHeader, PrimaryLink } from "../layout";
import { StoreProfileForm } from "@/components/features/store/store-profile-form";
import { requireSessionContext } from "@/lib/auth/session";
import { isDoorDashEnabled, isUberConfigured } from "@/lib/config/environment";

export default async function StoreProfilePage() {
  const { store } = await requireSessionContext();

  return (
    <DashboardPage>
      <PageHeader
        title="Store profile"
        description="Pickup address and delivery carriers."
        action={
          <PrimaryLink href="/dashboard/hours">Hours & prep</PrimaryLink>
        }
      />
      <DashboardPageBody>
        <StoreProfileForm
          store={store}
          configuredProviders={{
            uber: isUberConfigured(),
            doordashEnabled: isDoorDashEnabled(),
          }}
        />
      </DashboardPageBody>
    </DashboardPage>
  );
}
