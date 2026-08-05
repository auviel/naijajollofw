"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardPage, DashboardPageBody } from "@/components/layout/dashboard-page";
import { Button } from "@/components/ui/button";
import { isAppError } from "@/lib/utils/errors";

type DashboardErrorProps = {
  error: Error & { digest?: string; code?: string };
  reset: () => void;
};

function isAuthFailure(error: DashboardErrorProps["error"]): boolean {
  if (isAppError(error)) {
    return error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN";
  }
  return /authentication required|store manager access required/i.test(
    error.message,
  );
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("[dashboard] error boundary", error);
    if (!isAuthFailure(error)) return;
    router.replace("/api/auth/clear-session?callbackUrl=/login");
  }, [error, router]);

  if (isAuthFailure(error)) {
    return (
      <DashboardPage>
        <DashboardPageBody centered>
          <p className="text-sm text-text-secondary">Signing you out…</p>
        </DashboardPageBody>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <DashboardPageBody centered>
        <div className="w-full max-w-lg rounded-2xl bg-surface-elevated p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="mt-2 text-sm text-text-secondary">
            We could not load this page. Try again or return to the kitchen board.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Back to orders
            </Link>
          </div>
        </div>
      </DashboardPageBody>
    </DashboardPage>
  );
}
