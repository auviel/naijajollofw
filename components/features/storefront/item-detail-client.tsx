"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ItemCustomizePanel } from "@/components/features/storefront/item-customize-panel";
import type { MenuItemDetail } from "@/lib/domain/menu/types";

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
    // Keep scroll position; menu catalog restores from sessionStorage on mount.
    router.push("/", { scroll: false });
    window.setTimeout(() => {
      router.refresh();
    }, 80);
  }

  return (
    <div>
      <Link
        href="/"
        scroll={false}
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
