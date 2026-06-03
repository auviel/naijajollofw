import { LoginForm } from "@/components/features/auth/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-background px-4 py-8 safe-bottom">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            deliverGO
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Sign in to manage deliveries
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-elevated p-6">
          <Suspense fallback={<p className="text-sm text-text-secondary">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-text-tertiary">
          Powered by Uber Direct
        </p>
      </div>
    </div>
  );
}
