import Link from "next/link";
import {
  ClipboardList,
  Clock,
  Package,
  UtensilsCrossed,
  Users,
} from "@/components/ui/icons";
import { auth } from "@/lib/auth/index";
import { StoreBrandLogo } from "@/components/features/storefront/store-brand-logo";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { SidebarProfileMenu } from "@/components/layout/sidebar-profile-menu";

export async function Sidebar() {
  const session = await auth();
  const storeName = session?.user?.storeName ?? "Kitchen";

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col self-start overflow-x-hidden border-r border-border bg-surface md:flex">
      <div className="border-b border-border px-4 py-5">
        <Link
          href="/dashboard"
          className="inline-flex flex-col gap-1.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          aria-label={`${storeName} staff dashboard`}
        >
          <StoreBrandLogo
            alt={storeName}
            variant="header"
            className="h-10 w-[10.5rem]"
            priority
          />
          <span className="text-xs text-text-tertiary">Staff dashboard</span>
        </Link>
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
          href="/dashboard/hours"
          label="Hours & prep"
          icon={<Clock className="h-5 w-5" />}
        />
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <SidebarProfileMenu />
      </div>
    </aside>
  );
}
