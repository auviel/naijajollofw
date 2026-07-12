"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ItemCustomizePanel } from "@/components/features/storefront/item-customize-panel";
import type { MenuItemDetail } from "@/lib/domain/menu/types";

const MENU_SCROLL_KEY = "storefront-menu-scroll";

type ItemDetailClientProps = {
  item: MenuItemDetail;
  scheduleLabel?: string | null;
};

export function ItemDetailClient({
  item,
  scheduleLabel = null,
}: ItemDetailClientProps) {
  const router = useRouter();

  function handleAdded() {
    router.push("/");
    window.setTimeout(() => {
      router.refresh();
      restoreMenuScroll();
    }, 80);
  }

  return (
    <div>
      <Link
        href="/"
        className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
      >
        ← Back to menu
      </Link>
      <ItemCustomizePanel
        item={item}
        variant="page"
        scheduleLabel={scheduleLabel}
        onAdded={handleAdded}
      />
    </div>
  );
}

function restoreMenuScroll() {
  const raw = sessionStorage.getItem(MENU_SCROLL_KEY);
  if (raw == null) {
    return;
  }
  const top = Number(raw);
  if (!Number.isFinite(top)) {
    sessionStorage.removeItem(MENU_SCROLL_KEY);
    return;
  }

  sessionStorage.removeItem(MENU_SCROLL_KEY);
  window.scrollTo(0, top);
}
