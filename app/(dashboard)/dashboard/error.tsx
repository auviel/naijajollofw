"use client";

import { useEffect } from "react";
import Link from "next/link";
import { DashboardPage, DashboardPageBody } from "@/components/layout/dashboard-page";
import { Button } from "@/components/ui/button";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("[dashboard] error boundary", error);
  }, [error]);

  return (
    <DashboardPage>
      <DashboardPageBody centered>
        <div className="w-full max-w-lg rounded-lg border border-border bg-surface-elevated p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="mt-2 text-sm text-text-secondary">
            We could not load this page. Try again or return to your deliveries list.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <Link
              href="/dashboard/deliveries"
              className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Back to deliveries
            </Link>
          </div>
        </div>
      </DashboardPageBody>
    </DashboardPage>
  );
}
