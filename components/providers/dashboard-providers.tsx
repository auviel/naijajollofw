"use client";

import { ToastProvider } from "@/components/ui/toast";
import type { ReactNode } from "react";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex h-dvh flex-col overflow-hidden">{children}</div>
    </ToastProvider>
  );
}
