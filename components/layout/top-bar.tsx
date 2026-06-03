import { auth } from "@/lib/auth/index";
import { LogoutButton } from "@/components/features/auth/logout-button";
import { SandboxBadge } from "@/components/layout/sandbox-badge";
import { formatStoreProfileAddress } from "@/lib/domain/store/format";
import { getSessionContext } from "@/lib/auth/session";
import { isUberLiveMode } from "@/lib/config/environment";

export async function TopBar() {
  const session = await auth();
  const context = await getSessionContext();
  const storeAddress = context?.store ? formatStoreProfileAddress(context.store) : null;

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-3 px-4 py-2.5 md:h-14 md:px-6 md:py-0 lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {session?.user?.storeName ?? "Store"}
          </p>
          {storeAddress ? (
            <p className="hidden truncate text-xs text-text-tertiary sm:block">
              {storeAddress}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isUberLiveMode() ? <SandboxBadge /> : null}
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
