import type { Metadata } from "next";
import {
  DashboardPage,
  DashboardPageBody,
} from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { MenuCreateActions } from "@/components/features/menu/menu-create-actions";
import { MenuCatalogView } from "@/components/features/menu/menu-catalog";
import { listMenuCatalog } from "@/lib/services/menu/list-menu";

export const metadata: Metadata = {
  title: "Menu",
};

export default async function MenuAdminPage() {
  const catalog = await listMenuCatalog();

  return (
    <DashboardPage>
      <PageHeader
        title="Menu"
        description="Categories, items, and sold-out toggles for your storefront."
        action={<MenuCreateActions />}
      />
      <DashboardPageBody>
        <MenuCatalogView catalog={catalog} />
      </DashboardPageBody>
    </DashboardPage>
  );
}
