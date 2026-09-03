import { KitchenHeaderActions } from "@/components/kitchen/header-actions";
import { ItemThumb } from "@/components/kitchen/item-thumb";
import {
  DEFAULT_MENU_FILTERS,
  MenuFilterSheet,
  type MenuFilterState,
} from "@/components/kitchen/menu-filter-sheet";
import { SafeScreen } from "@/components/kitchen/safe-screen";
import { SearchField } from "@/components/kitchen/search-field";
import { apiFetch } from "@/lib/api";
import type { KitchenMenuCatalog } from "@/lib/kitchen/menu-types";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { formatCadFromCents } from "@naijajollof/api-types";
import { Card, KitchenCustomersSkeleton, Radii } from "@naijajollof/ui";
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

function filtersAreDefault(filters: MenuFilterState): boolean {
  return (
    filters.categoryId === DEFAULT_MENU_FILTERS.categoryId &&
    filters.availability === DEFAULT_MENU_FILTERS.availability
  );
}

export default function MenuTab() {
  const router = useRouter();
  const { colors } = useKitchenTheme();
  const styles = useThemedStyles((c) => ({
    content: { padding: 20, paddingBottom: 100, gap: 12 },
    topRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
    },
    addBtn: { padding: 4 },
    toolbar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
    },
    searchWrap: { flex: 1 },
    filterBtn: {
      width: 44,
      height: 44,
      borderRadius: Radii.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    filterDot: {
      position: "absolute" as const,
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.accent,
    },
    list: { gap: 10 },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    rowCopy: { flex: 1, gap: 2 },
    error: { ...KType.metaStrong, color: c.danger },
    empty: { ...KType.meta, textAlign: "center" as const, marginTop: 24 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(24,24,27,0.4)",
      justifyContent: "center" as const,
      padding: 24,
    },
    modalCard: {
      backgroundColor: c.surface,
      borderRadius: Radii.md,
      padding: 20,
      gap: 14,
    },
    modalInput: {
      minHeight: 48,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: Radii.sm,
      paddingHorizontal: 14,
      fontSize: 16,
      color: c.text,
    },
    modalActions: {
      flexDirection: "row" as const,
      justifyContent: "flex-end" as const,
      gap: 20,
    },
  }));
  const [catalog, setCatalog] = useState<KitchenMenuCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState<MenuFilterState>(DEFAULT_MENU_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<KitchenMenuCatalog>("/api/menu");
      setCatalog(data);
      setError(null);
      setApplied((current) => {
        if (
          current.categoryId &&
          !data.categories.some((c) => c.id === current.categoryId)
        ) {
          return { ...current, categoryId: null };
        }
        return current;
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
    const scoped = applied.categoryId
      ? activeCategories.filter((c) => c.id === applied.categoryId)
      : activeCategories;

    let rows = scoped.flatMap((category) => category.items);

    if (applied.availability === "available") {
      rows = rows.filter((item) => item.available);
    } else if (applied.availability === "sold_out") {
      rows = rows.filter((item) => !item.available);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((item) => item.name.toLowerCase().includes(q));
    }

    return rows;
  }, [activeCategories, applied, search]);

  const filtersActive = !filtersAreDefault(applied);
  const initialLoading = catalog === null && !error;

  function openAddMenu() {
    const goAddItem = () =>
      router.push({
        pathname: "/menu/new",
        params: applied.categoryId ? { categoryId: applied.categoryId } : {},
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
      setApplied((prev) => ({ ...prev, categoryId: category.id }));
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
        keyboardShouldPersistTaps="handled"
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
            <Ionicons name="add" size={24} color={colors.text} />
          </Pressable>
          <KitchenHeaderActions />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {initialLoading ? (
          <KitchenCustomersSkeleton />
        ) : (
          <>
            <View style={styles.toolbar}>
              <View style={styles.searchWrap}>
                <SearchField
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search menu"
                  accessibilityLabel="Search menu"
                />
              </View>
              <Pressable
                onPress={() => setFilterOpen(true)}
                style={styles.filterBtn}
                accessibilityRole="button"
                accessibilityLabel="Filter menu"
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={colors.text}
                />
                {filtersActive ? <View style={styles.filterDot} /> : null}
              </Pressable>
            </View>

            <View style={styles.list}>
              {items.length === 0 ? (
                <Text style={styles.empty}>No items match.</Text>
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

      <MenuFilterSheet
        visible={filterOpen}
        categories={activeCategories.map((c) => ({
          id: c.id,
          name: c.name,
        }))}
        value={applied}
        onApply={(next) => {
          setApplied(next);
          setFilterOpen(false);
        }}
        onDismiss={() => setFilterOpen(false)}
      />

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
              placeholderTextColor={colors.textSecondary}
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
                <Text style={[KType.metaStrong, { color: colors.accent }]}>
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
