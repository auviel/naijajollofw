"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MotionPage } from "@/components/motion/primitives";

export function MotionPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <MotionPage routeKey={pathname} className={className}>
      {children}
    </MotionPage>
  );
}
