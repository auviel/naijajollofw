import type { Metadata } from "next";
import Link from "next/link";
import { DinerSignupForm } from "@/components/features/storefront/diner-signup-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an account to track orders at Naija Jollof Waterloo.",
};

export default function SignupPage() {
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
        <span>Sign up</span>
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">
        Create account
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Save your details for faster checkout. Guest ordering still works
        without an account.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-background p-5 sm:p-6">
        <DinerSignupForm />
      </div>
    </section>
  );
}
