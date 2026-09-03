import { KitchenHeaderActions } from "@/components/kitchen/header-actions";
import { ItemThumb } from "@/components/kitchen/item-thumb";
import { SafeScreen } from "@/components/kitchen/safe-screen";
import { apiFetch } from "@/lib/api";
import { KType } from "@/lib/kitchen/typography";
import { formatCadFromCents } from "@naijajollof/api-types";
import {
  Card,
  Colors,
  KitchenCustomersSkeleton,
  Radii,
} from "@naijajollof/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  categoryName: string;
};

type MenuCategory = {
  id: string;
  name: string;
  active: boolean;
  items: MenuItemRow[];
};

type MenuCatalog = {
  categories: MenuCategory[];
};

export default function MenuTab() {
  const [catalog, setCatalog] = useState<MenuCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<MenuCatalog>("/api/menu");
      setCatalog(data);
      setError(null);
      setCategoryId((current) => {
        if (current && data.categories.some((c) => c.id === current)) {
          return current;
        }
        return data.categories.find((c) => c.active)?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load menu");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCategories = useMemo(
    () => (catalog?.categories ?? []).filter((c) => c.active),
    [catalog],
  );

  const items = useMemo(() => {
    const category = activeCategories.find((c) => c.id === categoryId);
    return category?.items ?? [];
  }, [activeCategories, categoryId]);

  const initialLoading = catalog === null && !error;

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.topRow}>
          <Text style={[KType.page, { flex: 1 }]}>Menu</Text>
          <KitchenHeaderActions />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {initialLoading ? (
          <KitchenCustomersSkeleton />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {activeCategories.map((category) => {
                const selected = category.id === categoryId;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        selected && styles.chipLabelSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.list}>
              {items.length === 0 ? (
                <Text style={styles.empty}>No items in this category.</Text>
              ) : (
                items.map((item) => (
                  <Card key={item.id} style={styles.row}>
                    <ItemThumb uri={item.imageUrl} size={56} />
                    <View style={styles.rowCopy}>
                      <Text style={KType.bodyStrong}>{item.name}</Text>
                      <Text style={KType.meta} numberOfLines={2}>
                        {item.available ? "Available" : "Unavailable"}
                        {item.description ? ` · ${item.description}` : ""}
                      </Text>
                      <Text style={KType.numeric}>
                        {formatCadFromCents(item.priceCents)}
                      </Text>
                    </View>
                  </Card>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100, gap: 12 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.accentSoft,
  },
  chipLabel: { ...KType.meta },
  chipLabelSelected: { ...KType.metaStrong, color: Colors.accent },
  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  rowCopy: { flex: 1, gap: 2 },
  error: { ...KType.metaStrong, color: Colors.danger },
  empty: { ...KType.meta, textAlign: "center", marginTop: 24 },
});
