import type { Metadata } from "next";
import { DashboardPage, DashboardPageBody, PageHeader } from "../../layout";
import { MenuItemForm } from "@/components/features/menu/menu-item-form";
import { listMenuCategories } from "@/lib/services/menu/list-categories";

export const metadata: Metadata = {
  title: "New item",
};

export default async function NewMenuItemPage() {
  const categories = await listMenuCategories();

  return (
    <DashboardPage>
      <PageHeader title="New item" description="Add a dish or drink to your menu." />
      <DashboardPageBody>
        <MenuItemForm mode="create" categories={categories} />
      </DashboardPageBody>
    </DashboardPage>
  );
}
