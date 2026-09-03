import { StackScroll } from "@/components/kitchen/stack-scroll";
import {
  MenuItemForm,
  menuItemToFormValues,
} from "@/components/kitchen/menu-item-form";
import { apiFetch } from "@/lib/api";
import type {
  KitchenMenuCatalog,
  KitchenMenuImage,
  KitchenMenuItemDetail,
} from "@/lib/kitchen/menu-types";
import { Screen, Skeleton } from "@naijajollof/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text } from "react-native";
import { KType } from "@/lib/kitchen/typography";
import { Colors } from "@naijajollof/ui";

export default function EditMenuItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<KitchenMenuItemDetail | null>(null);
  const [categories, setCategories] = useState<
    KitchenMenuCatalog["categories"]
  >([]);
  const [images, setImages] = useState<KitchenMenuImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [detail, catalog] = await Promise.all([
        apiFetch<KitchenMenuItemDetail>(`/api/menu/items/${id}`),
        apiFetch<KitchenMenuCatalog>("/api/menu"),
      ]);
      setItem(detail);
      setImages(detail.images ?? []);
      setCategories(catalog.categories);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load item.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const initial = useMemo(
    () => (item ? menuItemToFormValues(item) : null),
    [item],
  );

  if (loading || !initial || !item) {
    return (
      <Screen>
        <StackScroll>
          {error ? (
            <Text style={{ ...KType.meta, color: Colors.danger }}>{error}</Text>
          ) : (
            <>
              <Skeleton height={200} />
              <Skeleton height={120} />
            </>
          )}
        </StackScroll>
      </Screen>
    );
  }

  return (
    <Screen>
      <StackScroll>
        <MenuItemForm
          categories={categories}
          initial={initial}
          itemId={item.id}
          images={images}
          onImagesChange={setImages}
          submitLabel="Save"
          busy={busy}
          error={error}
          onSubmit={(values) => {
            setBusy(true);
            setError(null);
            void (async () => {
              try {
                await apiFetch(`/api/menu/items/${item.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({
                    categoryId: values.categoryId,
                    name: values.name,
                    description: values.description,
                    priceCents: values.priceCents,
                    available: values.available,
                  }),
                });
                router.back();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not save item.",
                );
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      </StackScroll>
    </Screen>
  );
}
