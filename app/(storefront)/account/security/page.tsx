import type { Metadata } from "next";
import { AccountSecurityClient } from "@/components/features/account/account-security-client";
import { requireDiner } from "@/lib/auth/session";
import { userRepository } from "@/lib/db/repositories/user.repository";

export const metadata: Metadata = {
  title: "Security",
  description: "Password and email settings.",
};

export default async function AccountSecurityPage() {
  const sessionUser = await requireDiner();
  const user = await userRepository.findById(sessionUser.id);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Security
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Update your password or email address.
        </p>
      </div>
      <AccountSecurityClient
        email={user?.email ?? sessionUser.email}
        emailVerified={Boolean(user?.emailVerifiedAt)}
      />
    </section>
  );
}
