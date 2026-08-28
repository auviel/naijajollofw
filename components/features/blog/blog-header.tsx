"use client";

import Link from "next/link";
import { StoreBrandLogo } from "@/components/features/storefront/store-brand-logo";
import { ArrowLeft } from "@/components/ui/icons";

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <div className="mx-auto flex h-[var(--storefront-header-height)] w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex shrink-0 text-foreground no-underline"
          aria-label="Naija Jollof"
        >
          <StoreBrandLogo alt="Naija Jollof" variant="header" priority />
        </Link>

        <Link
          href="/"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-sm font-medium text-foreground no-underline transition-colors hover:bg-surface"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to site
        </Link>
      </div>
    </header>
  );
}
