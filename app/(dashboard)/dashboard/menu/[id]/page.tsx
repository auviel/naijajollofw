import { notFound } from "next/navigation";
import { DashboardPage, DashboardPageBody, PageHeader } from "../../layout";
import { MenuItemForm } from "@/components/features/menu/menu-item-form";
import { getMenuItem } from "@/lib/services/menu/get-menu-item";
import { listMenuCategories } from "@/lib/services/menu/list-categories";
import { isAppError } from "@/lib/utils/errors";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MenuItemAdminPage({ params }: PageProps) {
  const { id } = await params;

  if (id === "new") {
    notFound();
  }

  let item;
  try {
    item = await getMenuItem(id);
  } catch (error) {
    if (isAppError(error) && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const categories = await listMenuCategories();

  return (
    <DashboardPage>
      <PageHeader title={item.name} description="Edit price, availability, and modifiers." />
      <DashboardPageBody>
        <MenuItemForm mode="edit" categories={categories} item={item} />
      </DashboardPageBody>
    </DashboardPage>
  );
}
