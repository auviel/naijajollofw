import {
  ClipboardList,
  Clock,
  Package,
  Store,
  UtensilsCrossed,
  Users,
} from "@/components/ui/icons";
import { auth } from "@/lib/auth/index";
import { LogoutButton } from "@/components/features/auth/logout-button";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { formatStoreProfileAddress } from "@/lib/domain/store/format";
import { getSessionContext } from "@/lib/auth/session";

export async function Sidebar() {
  const session = await auth();
  const context = await getSessionContext();
  const storeAddress = context?.store
    ? formatStoreProfileAddress(context.store)
    : null;

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col self-start overflow-hidden border-r border-border bg-surface md:flex">
      <div className="border-b border-border px-5 py-6">
        <span className="text-lg font-semibold tracking-tight">deliverGO</span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
        <SidebarNavLink
          href="/dashboard"
          label="Orders"
          icon={<ClipboardList className="h-5 w-5" />}
          exact
          matchPrefixes={["/dashboard/orders"]}
          excludeSearchParam="channel"
          excludeSearchValue="courier"
        />
        <SidebarNavLink
          href="/dashboard/menu"
          label="Menu"
          icon={<UtensilsCrossed className="h-5 w-5" />}
        />
        <SidebarNavLink
          href="/dashboard/orders?channel=courier"
          label="Courier"
          icon={<Package className="h-5 w-5" />}
          matchPrefixes={["/dashboard/orders"]}
          matchSearchParam="channel"
          matchSearchValue="courier"
        />
        <SidebarNavLink
          href="/dashboard/customers"
          label="Customers"
          icon={<Users className="h-5 w-5" />}
        />
        <SidebarNavLink
          href="/dashboard/store"
          label="Store profile"
          icon={<Store className="h-5 w-5" />}
        />
        <SidebarNavLink
          href="/dashboard/hours"
          label="Hours & prep"
          icon={<Clock className="h-5 w-5" />}
        />
      </nav>

      <div className="shrink-0 border-t border-border p-4">
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
