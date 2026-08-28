"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

function isBlogPath(pathname: string) {
  return pathname === "/blog" || pathname.startsWith("/blog/");
}

export function StorefrontFooterFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const blog = isBlogPath(pathname);

  return (
    <footer
      className={cn(
        "mt-auto border-t border-border bg-surface",
        blog
          ? "pb-10"
          : "pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-0",
      )}
    >
      {children}
    </footer>
  );
}
