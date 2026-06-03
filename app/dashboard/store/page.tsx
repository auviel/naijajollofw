import { DashboardPage, DashboardPageBody, PageHeader } from "../layout";
import { StoreProfileForm } from "@/components/features/store/store-profile-form";
import { requireSessionContext } from "@/lib/auth/session";

export default async function StoreProfilePage() {
  const { store } = await requireSessionContext();

  return (
    <DashboardPage>
      <PageHeader title="Store profile" />
      <DashboardPageBody>
        <StoreProfileForm store={store} />
      </DashboardPageBody>
    </DashboardPage>
  );
}
