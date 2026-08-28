import { DinerTabHeader } from "@/components/diner-tab-header";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCadFromCents, type StoreOpenStatus } from "@naijajollof/api-types";
import { Card, Colors, MenuScreenSkeleton, Radii, Screen, Type } from "@naijajollof/ui";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type MenuPayload = {
  store: {
    name: string;
    addressLine1: string;
    city: string;
    province: string;
  };
  catalog: {
    categories: Array<{
      id: string;
      name: string;
      items: Array<{
        id: string;
        slug: string;
        name: string;
        description: string | null;
        priceCents: number;
        imageUrl: string | null;
        available: boolean;
      }>;
    }>;
  };
};

export default function MenuScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<MenuPayload | null>(null);
  const [hours, setHours] = useState<StoreOpenStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [menu, openStatus] = await Promise.all([
      apiFetch<MenuPayload>("/api/storefront/menu"),
      apiFetch<StoreOpenStatus>("/api/storefront/hours").catch(() => null),
    ]);
    setData(menu);
    setHours(openStatus);
    setError(null);
  }, []);

  useEffect(() => {
    void load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Could not load menu"),
    );
  }, [load]);

  if (!data && !error) {
    return (
      <Screen>
        {Platform.OS === "ios" ? <DinerTabHeader title="Menu" /> : null}
        <MenuScreenSkeleton />
      </Screen>
    );
  }

  return (
    <Screen>
      {Platform.OS === "ios" ? <DinerTabHeader title="Menu" /> : null}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load()
                .catch(() => undefined)
                .finally(() => setRefreshing(false));
            }}
          />
        }
      >
        <Text style={Type.display}>{data?.store.name ?? "Naija Jollof"}</Text>
        {data ? (
          <Text style={Type.meta}>
            {data.store.addressLine1}, {data.store.city} {data.store.province}
          </Text>
        ) : null}
        {hours ? (
          <View style={[styles.pill, !hours.isOpen && styles.pillClosed]}>
            <Text style={styles.pillText}>{hours.message}</Text>
          </View>
        ) : null}
        {!user ? (
          <Pressable onPress={() => router.push("/login")}>
            <Text style={styles.link}>Sign in for history & notifications</Text>
          </Pressable>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {data?.catalog.categories.map((category) => (
          <View key={category.id} style={styles.category}>
            <Text style={Type.headline}>{category.name}</Text>
            {category.items.map((item) => (
              <Card key={item.id} onPress={() => router.push(`/item/${item.slug}`)} style={styles.item}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imageFallback]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description ? (
                    <Text numberOfLines={2} style={Type.meta}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={styles.price}>
                    {formatCadFromCents(item.priceCents)}
                    {item.available ? "" : " · Sold out"}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: Platform.OS === "android" ? 120 : 48,
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: Colors.successSoft,
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillClosed: { backgroundColor: Colors.dangerSoft },
  pillText: { fontWeight: "700", fontSize: 12, color: Colors.text },
  link: { color: Colors.success, fontWeight: "700" },
  error: { color: Colors.danger },
  category: { gap: 10, marginTop: 10 },
  item: { flexDirection: "row", gap: 12, alignItems: "center", padding: 12 },
  image: { width: 76, height: 76, borderRadius: Radii.sm, backgroundColor: Colors.background },
  imageFallback: { backgroundColor: "#eee" },
  itemName: { fontWeight: "800", fontSize: 16, color: Colors.text },
  price: { color: Colors.accent, marginTop: 6, fontWeight: "800" },
});
