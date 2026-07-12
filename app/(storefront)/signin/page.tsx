import type { Metadata } from "next";
import { Suspense } from "react";
import { DinerSigninForm } from "@/components/features/storefront/diner-signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Naija Jollof Waterloo account.",
};

export default function SigninPage() {
  return (
    <section className="mx-auto w-full max-w-md py-8 sm:py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Access your orders and checkout faster next time.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-background p-5 sm:p-6">
        <Suspense
          fallback={<p className="text-sm text-text-secondary">Loading…</p>}
        >
          <DinerSigninForm />
        </Suspense>
      </div>
    </section>
  );
}
