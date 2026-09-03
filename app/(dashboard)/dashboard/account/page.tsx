import type { Metadata } from "next";
import {
  DashboardPage,
  DashboardPageBody,
} from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { StaffAccountForm } from "@/components/features/account/staff-account-form";
import { requireSessionContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Account",
};

export default async function DashboardAccountPage() {
  const { user } = await requireSessionContext();

  return (
    <DashboardPage>
      <PageHeader
        title="Account"
        description="Your profile and password."
      />
      <DashboardPageBody>
        <StaffAccountForm
          initial={{
            name: user.name,
            email: user.email,
            phoneE164: user.phoneE164 ?? null,
            role: user.role,
          }}
        />
      </DashboardPageBody>
    </DashboardPage>
  );
}
