import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { SkipLink } from "@/components/layout/skip-link";
import { TopBar } from "@/components/layout/top-bar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MotionPageShell } from "@/components/motion/motion-page-shell";
import { DashboardProviders } from "@/components/providers/dashboard-providers";
import { getSessionUser } from "@/lib/auth/session";
import { privatePageMetadata } from "@/lib/seo/noindex";

export const metadata: Metadata = privatePageMetadata({
  title: "Dashboard",
  description: "Staff dashboard for Naija Jollof Waterloo.",
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "STORE_MANAGER") {
    // Stale JWT after DB reset: clear cookie via route handler (layouts can't set cookies).
    redirect("/api/auth/clear-session?callbackUrl=/login");
  }

  return (
    <DashboardProviders>
      <SkipLink />
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <TopBar />
            <main
              id="main-content"
              tabIndex={-1}
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] focus:outline-none md:pb-0"
            >
              <div className="mx-auto w-full max-w-6xl p-4 sm:p-5 md:p-6 lg:p-8">
                <MotionPageShell>{children}</MotionPageShell>
              </div>
            </main>
          </div>
        </div>
        <Suspense fallback={null}>
          <MobileNav />
        </Suspense>
      </div>
    </DashboardProviders>
  );
}
