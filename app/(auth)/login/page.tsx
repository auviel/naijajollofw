import type { Metadata } from "next";
import { LoginForm } from "@/components/features/auth/login-form";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Staff sign in",
  description: "Sign in to manage kitchen orders and deliveries.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-background px-4 py-8 safe-bottom">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Staff sign in
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Manage kitchen orders, menu, and courier dispatch
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated p-6">
          <Suspense
            fallback={
              <p className="text-sm text-text-secondary">Loading…</p>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
