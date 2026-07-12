import type { Metadata } from "next";
import { DinerForgotPasswordForm } from "@/components/features/storefront/diner-forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Naija Jollof Waterloo account password.",
};

export default function ForgotPasswordPage() {
  return (
    <section className="mx-auto w-full max-w-md py-8 sm:py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Forgot password
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Enter your email and we&apos;ll send a link to reset your password.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-background p-5 sm:p-6">
        <DinerForgotPasswordForm />
      </div>
    </section>
  );
}
