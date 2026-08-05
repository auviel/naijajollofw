"use client";

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

  function goToMenu() {
    router.push("/", { scroll: false });
  }

  function handleAdded() {
    // Keep scroll position; menu catalog restores from sessionStorage on mount.
    goToMenu();
    window.setTimeout(() => {
      router.refresh();
    }, 80);
  }

  return (
    <ItemCustomizePanel
      item={item}
      variant="page"
      scheduleLabel={scheduleLabel}
      showImageHero
      onClose={goToMenu}
      onAdded={handleAdded}
    />
  );
}
