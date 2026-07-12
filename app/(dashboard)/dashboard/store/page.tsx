import { DashboardPage, DashboardPageBody, PageHeader } from "../layout";
import { StoreProfileForm } from "@/components/features/store/store-profile-form";
import { requireSessionContext } from "@/lib/auth/session";
import { isDoorDashEnabled, isUberConfigured } from "@/lib/config/environment";

export default async function StoreProfilePage() {
  const { store } = await requireSessionContext();

  return (
    <DashboardPage>
      <PageHeader title="Store profile" />
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
