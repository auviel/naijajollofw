import type { Metadata } from "next";
import { DinerSignupForm } from "@/components/features/storefront/diner-signup-form";
import { getTurnstileSiteKey } from "@/lib/integrations/turnstile/config";

import { privatePageMetadata } from "@/lib/seo/noindex";

export const metadata: Metadata = privatePageMetadata({
  title: "Create account",
  description: "Create an account to track orders at Naija Jollof Waterloo.",
});

export default function SignupPage() {
  return (
    <section className="mx-auto w-full max-w-md py-8 sm:py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Create account
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Save your details for faster checkout. Guest ordering still works
        without an account.
      </p>
      <div className="mt-8 rounded-2xl bg-surface-elevated p-5 sm:p-6">
        <DinerSignupForm turnstileSiteKey={getTurnstileSiteKey()} />
      </div>
    </section>
  );
}
