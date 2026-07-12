import type { Metadata } from "next";
import { Suspense } from "react";
import { DinerResetPasswordForm } from "@/components/features/storefront/diner-reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Naija Jollof Waterloo account.",
};

export default function ResetPasswordPage() {
  return (
    <section className="mx-auto w-full max-w-md py-8 sm:py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Reset password
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Choose a new password for your account.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-background p-5 sm:p-6">
        <Suspense
          fallback={<p className="text-sm text-text-secondary">Loading…</p>}
        >
          <DinerResetPasswordForm />
        </Suspense>
      </div>
    </section>
  );
}
