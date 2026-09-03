import { KitchenHeaderActions } from "@/components/kitchen/header-actions";
import { SafeScreen } from "@/components/kitchen/safe-screen";
import { KType } from "@/lib/kitchen/typography";
import { apiFetch } from "@/lib/api";
import {
  Card,
  Colors,
  Field,
  KitchenCustomersSkeleton,
} from "@naijajollof/ui";
import { useRouter } from "expo-router";
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
          <KitchenHeaderActions />
        </View>

        <Field
          placeholder="Name, phone, or email"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {initialLoading ? (
          <KitchenCustomersSkeleton />
        ) : items?.length === 0 ? (
          <Text style={styles.empty}>No customers found.</Text>
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
                    {customer.orderCount > 0
                      ? ` · ${customer.orderCount} orders`
                      : ""}
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
    gap: 12,
  },
  list: { gap: 10 },
  row: { gap: 4 },
  error: { ...KType.metaStrong, color: Colors.danger },
  empty: { ...KType.meta, textAlign: "center", marginTop: 32 },
});
