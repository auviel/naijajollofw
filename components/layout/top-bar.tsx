import { LogoutButton } from "@/components/features/auth/logout-button";
import { DashboardGlobalSearch } from "@/components/layout/dashboard-global-search";
import { SandboxBadge } from "@/components/layout/sandbox-badge";
import { StaffNotifications } from "@/components/layout/staff-notifications";
import { isUberLiveMode } from "@/lib/config/environment";

export async function TopBar() {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-border bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-3 px-4 py-2.5 md:h-14 md:px-6 md:py-0 lg:px-8">
        <DashboardGlobalSearch />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <StaffNotifications />
          {!isUberLiveMode() ? <SandboxBadge /> : null}
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
