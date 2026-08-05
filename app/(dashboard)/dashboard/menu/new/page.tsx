import type { Metadata } from "next";
import {
  DashboardPage,
  DashboardPageBody,
} from "@/components/layout/dashboard-page";
import { MenuItemForm } from "@/components/features/menu/menu-item-form";
import { getMenuItemFormOptions } from "@/lib/services/menu/list-categories";

export const metadata: Metadata = {
  title: "New item",
};

export default async function NewMenuItemPage() {
  const { categories, pickerItems } = await getMenuItemFormOptions();

  return (
    <DashboardPage>
      <DashboardPageBody>
        <MenuItemForm
          mode="create"
          categories={categories}
          pickerItems={pickerItems}
        />
      </DashboardPageBody>
    </DashboardPage>
  );
}
