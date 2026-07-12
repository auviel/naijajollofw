import type { Metadata } from "next";
import Link from "next/link";
import { DinerForgotPasswordForm } from "@/components/features/storefront/diner-forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Naija Jollof Waterloo account password.",
};

export default function ForgotPasswordPage() {
  return (
    <section className="mx-auto w-full max-w-md py-8 sm:py-12">
      <p className="text-sm text-text-tertiary">
        <Link
          href="/"
          className="text-text-secondary no-underline transition-colors hover:text-foreground"
        >
          Home
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <Link
          href="/signin"
          className="text-text-secondary no-underline transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <span>Forgot password</span>
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">
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
