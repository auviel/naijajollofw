"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MotionPageShell } from "@/components/motion/motion-page-shell";
import { cn } from "@/lib/utils/cn";

function isBlogPath(pathname: string) {
  return pathname === "/blog" || pathname.startsWith("/blog/");
}

export function StorefrontMain({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const blog = isBlogPath(pathname);

  return (
    <main
      id="main-content"
      className={cn(
        "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
        blog
          ? "pb-8"
          : "pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-8",
      )}
    >
      <MotionPageShell>{children}</MotionPageShell>
    </main>
  );
}
