import { KitchenHeaderActions } from "@/components/kitchen/header-actions";
import { SafeScreen } from "@/components/kitchen/safe-screen";
import { SearchField } from "@/components/kitchen/search-field";
import { KType } from "@/lib/kitchen/typography";
import { apiFetch } from "@/lib/api";
import {
  Card,
  Colors,
  KitchenCustomersSkeleton,
} from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type StaffCustomerRow = {
  id: string;
  name: string;
  primaryPhone: string | null;
  primaryAddress: string | null;
  orderCount: number;
};

type ListCustomersPayload = {
  items: StaffCustomerRow[];
  search: string;
};

export default function CustomersTab() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [items, setItems] = useState<StaffCustomerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (debouncedQ) params.set("q", debouncedQ);
      const result = await apiFetch<ListCustomersPayload>(
        `/api/customers?${params.toString()}`,
      );
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customers");
    }
  }, [debouncedQ]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const initialLoading = items === null && !error;

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
          <Text style={[KType.page, { flex: 1 }]}>Customers</Text>
          <Pressable
            onPress={() => router.push("/customers/new")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add customer"
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color={Colors.text} />
          </Pressable>
          <KitchenHeaderActions />
        </View>

        <SearchField
          value={q}
          onChangeText={setQ}
          placeholder="Name, phone, or email"
          accessibilityLabel="Search customers"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {initialLoading ? (
          <KitchenCustomersSkeleton />
        ) : items?.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.empty}>No customers found.</Text>
            <Pressable
              onPress={() => router.push("/customers/new")}
              hitSlop={8}
            >
              <Text style={styles.emptyCta}>Add one</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {items?.map((customer) => (
              <Pressable
                key={customer.id}
                onPress={() => router.push(`/customers/${customer.id}`)}
              >
                <Card style={styles.row}>
                  <Text style={KType.bodyStrong}>{customer.name}</Text>
                  <Text style={KType.meta}>
                    {customer.primaryPhone ?? "No phone"}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
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
    gap: 8,
  },
  addBtn: {
    padding: 4,
  },
  list: { gap: 10 },
  row: { gap: 4 },
  error: { ...KType.metaStrong, color: Colors.danger },
  emptyBlock: { alignItems: "center", gap: 8, marginTop: 32 },
  empty: { ...KType.meta, textAlign: "center" },
  emptyCta: { ...KType.metaStrong, color: Colors.accent },
});
