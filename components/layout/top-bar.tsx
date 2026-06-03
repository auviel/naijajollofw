import { auth } from "@/lib/auth/index";
import { SandboxBadge } from "@/components/layout/sandbox-badge";
import { formatStoreProfileAddress } from "@/lib/domain/store/format";
import { getSessionContext } from "@/lib/auth/session";
import { isUberLiveMode } from "@/lib/config/environment";

export async function TopBar() {
  const session = await auth();
  const context = await getSessionContext();
  const storeAddress = context?.store ? formatStoreProfileAddress(context.store) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="min-w-0 md:hidden">
          <p className="truncate text-sm font-semibold text-foreground">deliverGO</p>
        </div>

        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate text-sm font-medium text-foreground">
            {session?.user?.storeName ?? "Store"}
          </p>
          <p className="truncate text-xs text-text-tertiary">
            {storeAddress ?? "Store address"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isUberLiveMode() ? <SandboxBadge /> : null}
          <div className="hidden text-right sm:block md:hidden">
            <p className="truncate text-sm font-medium text-foreground">
              {session?.user?.storeName ?? "Store"}
            </p>
            <p className="truncate text-xs text-text-tertiary">
              {storeAddress ?? "Store address"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
