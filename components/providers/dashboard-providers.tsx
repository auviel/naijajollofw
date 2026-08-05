"use client";

import { StaffKitchenLiveProvider } from "@/components/providers/staff-kitchen-live-context";
import { ToastProvider } from "@/components/ui/toast";
import type { ReactNode } from "react";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <StaffKitchenLiveProvider>
        <div className="flex h-dvh flex-col overflow-hidden">{children}</div>
      </StaffKitchenLiveProvider>
    </ToastProvider>
  );
}
