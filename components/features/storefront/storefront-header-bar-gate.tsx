"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function isChatPath(pathname: string) {
  return pathname === "/chat" || pathname.startsWith("/chat/");
}

/** Hides the storefront logo bar on full-screen Ask Amaka chat. */
export function StorefrontHeaderBarGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (isChatPath(pathname)) {
    return null;
  }
  return children;
}

export { isChatPath };
