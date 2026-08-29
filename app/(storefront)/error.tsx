"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/nextjs";

type StorefrontErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function StorefrontError({ error, reset }: StorefrontErrorProps) {
  useEffect(() => {
    console.error("[storefront] error boundary", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        We could not load this page. Try again, or head back to the menu.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          Back to menu
        </Link>
      </div>
    </div>
  );
}
