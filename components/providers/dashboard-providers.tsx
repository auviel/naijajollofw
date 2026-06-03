"use client";

import { ToastProvider } from "@/components/ui/toast";
import type { ReactNode } from "react";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </ToastProvider>
  );
}
