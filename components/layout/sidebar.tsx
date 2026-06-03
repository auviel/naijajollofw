import { Package, Plus, Store } from "lucide-react";
import { auth } from "@/lib/auth/index";
import { LogoutButton } from "@/components/features/auth/logout-button";
import { SandboxBadge } from "@/components/layout/sandbox-badge";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { formatStoreProfileAddress } from "@/lib/domain/store/format";
import { getSessionContext } from "@/lib/auth/session";
import { isUberLiveMode } from "@/lib/config/environment";

export async function Sidebar() {
  const session = await auth();
  const context = await getSessionContext();
  const storeAddress = context?.store ? formatStoreProfileAddress(context.store) : null;

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:flex md:h-full md:min-h-0 md:flex-col">
      <div className="border-b border-border px-5 py-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-semibold tracking-tight">deliverGO</span>
          {!isUberLiveMode() ? <SandboxBadge /> : null}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <SidebarNavLink
          href="/dashboard/deliveries"
          label="Deliveries"
          icon={<Package className="h-5 w-5" />}
          excludePaths={["/dashboard/deliveries/new"]}
        />
        <SidebarNavLink
          href="/dashboard/deliveries/new"
          label="New delivery"
          icon={<Plus className="h-5 w-5" />}
        />
        <SidebarNavLink
          href="/dashboard/store"
          label="Store profile"
          icon={<Store className="h-5 w-5" />}
        />
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs font-medium text-foreground">
          {session?.user?.storeName ?? "Store"}
        </p>
        <p className="text-xs text-text-tertiary">
          {storeAddress ?? "Store address"}
        </p>
        <div className="mt-2">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
