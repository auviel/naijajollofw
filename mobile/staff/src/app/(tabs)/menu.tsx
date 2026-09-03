import { KitchenHeaderActions } from "@/components/kitchen/header-actions";
import { ItemThumb } from "@/components/kitchen/item-thumb";
import { SafeScreen } from "@/components/kitchen/safe-screen";
import { apiFetch } from "@/lib/api";
import type { KitchenMenuCatalog } from "@/lib/kitchen/menu-types";
import { KType } from "@/lib/kitchen/typography";
import { formatCadFromCents } from "@naijajollof/api-types";
import {
  Card,
  Colors,
  KitchenCustomersSkeleton,
  Radii,
} from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function MenuTab() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<KitchenMenuCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<KitchenMenuCatalog>("/api/menu");
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const activeCategories = useMemo(
    () => (catalog?.categories ?? []).filter((c) => c.active),
    [catalog],
  );

  const items = useMemo(() => {
    const category = activeCategories.find((c) => c.id === categoryId);
    return category?.items ?? [];
  }, [activeCategories, categoryId]);

  const initialLoading = catalog === null && !error;

  function openAddMenu() {
    const goAddItem = () =>
      router.push({
        pathname: "/menu/new",
        params: categoryId ? { categoryId } : {},
      });
    const goNewCategory = () => {
      setNewCategoryName("");
      setCategoryModal(true);
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Add item", "New category"],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) goAddItem();
          if (index === 2) goNewCategory();
        },
      );
      return;
    }

    Alert.alert("Menu", undefined, [
      { text: "Add item", onPress: goAddItem },
      { text: "New category", onPress: goNewCategory },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const category = await apiFetch<{ id: string; name: string }>(
        "/api/menu/categories",
        {
          method: "POST",
          body: JSON.stringify({ name }),
        },
      );
      setCategoryModal(false);
      setNewCategoryName("");
      await load();
      setCategoryId(category.id);
    } catch (e) {
      Alert.alert(
        "Could not create category",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setCreatingCategory(false);
    }
  }

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
          <Pressable
            onPress={openAddMenu}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add menu item or category"
            style={styles.addBtn}
          >
            <Ionicons name="add" size={24} color={Colors.text} />
          </Pressable>
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
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/menu/${item.id}`)}
                    accessibilityRole="button"
                  >
                    <Card style={styles.row}>
                      <ItemThumb uri={item.imageUrl} size={56} />
                      <View style={styles.rowCopy}>
                        <Text style={KType.bodyStrong} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={KType.numeric}>
                          {formatCadFromCents(item.priceCents)}
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={categoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCategoryModal(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={KType.bodyStrong}>New category</Text>
            <TextInput
              style={styles.modalInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Category name"
              placeholderTextColor={Colors.textSecondary}
              autoFocus
              maxLength={80}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setCategoryModal(false)}>
                <Text style={KType.meta}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void createCategory()}
                disabled={creatingCategory || !newCategoryName.trim()}
              >
                <Text style={[KType.metaStrong, { color: Colors.accent }]}>
                  {creatingCategory ? "Creating…" : "Create"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100, gap: 12 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addBtn: { padding: 4 },
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
    alignItems: "center",
    gap: 12,
  },
  rowCopy: { flex: 1, gap: 2 },
  error: { ...KType.metaStrong, color: Colors.danger },
  empty: { ...KType.meta, textAlign: "center", marginTop: 24 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(24,24,27,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: 20,
    gap: 14,
  },
  modalInput: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
  },
});
