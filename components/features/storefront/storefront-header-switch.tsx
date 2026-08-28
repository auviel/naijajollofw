"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BlogHeader } from "@/components/features/blog/blog-header";

function isBlogPath(pathname: string) {
  return pathname === "/blog" || pathname.startsWith("/blog/");
}

export function StorefrontHeaderSwitch({
  storefront,
}: {
  storefront: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  if (isBlogPath(pathname)) {
    return <BlogHeader />;
  }
  return storefront;
}
