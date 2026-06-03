import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

type DashboardPageProps = {
  children: ReactNode;
  className?: string;
};

/** Full-height page wrapper for dashboard routes. */
export function DashboardPage({ children, className }: DashboardPageProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>{children}</div>
  );
}

type DashboardPageBodyProps = {
  children: ReactNode;
  className?: string;
  centered?: boolean;
};

/** Grows to fill remaining space below the page header. */
export function DashboardPageBody({
  children,
  className,
  centered = false,
}: DashboardPageBodyProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        centered && "items-center justify-center",
        className,
      )}
    >
      {children}
    </div>
  );
}
