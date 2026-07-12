import { DashboardPage, DashboardPageBody, PageHeader, PrimaryLink } from "../layout";
import { CreateCategoryForm } from "@/components/features/menu/create-category-form";
import { MenuCatalogView } from "@/components/features/menu/menu-catalog";
import { listMenuCatalog } from "@/lib/services/menu/list-menu";

export default async function MenuAdminPage() {
  const catalog = await listMenuCatalog();

  return (
    <DashboardPage>
      <PageHeader
        title="Menu"
        description="Categories, items, and sold-out toggles for your storefront."
        action={<PrimaryLink href="/dashboard/menu/new">New item</PrimaryLink>}
      />
      <DashboardPageBody className="space-y-6">
        <CreateCategoryForm />
        <MenuCatalogView catalog={catalog} />
      </DashboardPageBody>
    </DashboardPage>
  );
}
