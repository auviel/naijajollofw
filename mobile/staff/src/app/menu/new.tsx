import { StackScroll } from "@/components/kitchen/stack-scroll";
import {
  emptyMenuItemForm,
  MenuItemForm,
} from "@/components/kitchen/menu-item-form";
import { apiFetch } from "@/lib/api";
import type {
  KitchenMenuCatalog,
  KitchenMenuItemDetail,
} from "@/lib/kitchen/menu-types";
import { Screen, Skeleton } from "@naijajollof/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function NewMenuItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const [categories, setCategories] = useState<
    KitchenMenuCatalog["categories"]
  >([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const catalog = await apiFetch<KitchenMenuCatalog>("/api/menu");
      setCategories(catalog.categories);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const defaultCategoryId = useMemo(() => {
    const fromParam =
      typeof params.categoryId === "string" ? params.categoryId : null;
    if (fromParam && categories.some((c) => c.id === fromParam && c.active)) {
      return fromParam;
    }
    return categories.find((c) => c.active)?.id ?? "";
  }, [categories, params.categoryId]);

  const initial = useMemo(
    () => emptyMenuItemForm(defaultCategoryId),
    [defaultCategoryId],
  );

  if (loading) {
    return (
      <Screen>
        <StackScroll>
          <Skeleton height={200} />
          <Skeleton height={80} />
        </StackScroll>
      </Screen>
    );
  }

  return (
    <Screen>
      <StackScroll>
        <MenuItemForm
          key={defaultCategoryId}
          categories={categories}
          initial={initial}
          submitLabel="Create item"
          busy={busy}
          error={error}
          onSubmit={(values) => {
            setBusy(true);
            setError(null);
            void (async () => {
              try {
                const item = await apiFetch<KitchenMenuItemDetail>(
                  "/api/menu/items",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      categoryId: values.categoryId,
                      name: values.name,
                      description: values.description,
                      priceCents: values.priceCents,
                      available: values.available,
                    }),
                  },
                );
                // Open edit so photos can be added on the same item.
                router.replace(`/menu/${item.id}`);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not create item.",
                );
                setBusy(false);
              }
            })();
          }}
        />
      </StackScroll>
    </Screen>
  );
}
