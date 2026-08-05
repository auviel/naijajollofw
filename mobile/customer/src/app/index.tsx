import { Colors } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCadFromCents } from "@naijajollof/api-types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type MenuPayload = {
  store: { name: string };
  catalog: {
    categories: Array<{
      id: string;
      name: string;
      items: Array<{
        id: string;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<MenuPayload>("/api/storefront/menu")
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load menu"),
      );
  }, []);

  if (!data && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <Text style={styles.store}>{data?.store.name ?? "Naija Jollof"}</Text>
        <View style={styles.topActions}>
          <Pressable onPress={() => router.push("/cart")}>
            <Text style={styles.link}>Cart</Text>
          </Pressable>
          <Pressable onPress={() => router.push(user ? "/account" : "/login")}>
            <Text style={styles.link}>{user ? "Account" : "Sign in"}</Text>
          </Pressable>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {data?.catalog.categories.map((category) => (
        <View key={category.id} style={styles.category}>
          <Text style={styles.categoryTitle}>{category.name}</Text>
          {category.items.map((item) => (
            <Pressable
              key={item.id}
              style={styles.item}
              onPress={() => router.push(`/item/${item.id}`)}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imageFallback]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {formatCadFromCents(item.priceCents)}
                  {item.available ? "" : " · Sold out"}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 18, paddingBottom: 48 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  store: { fontSize: 22, fontWeight: "800" },
  topActions: { flexDirection: "row", gap: 16 },
  link: { color: Colors.success, fontWeight: "700" },
  error: { color: Colors.danger },
  category: { gap: 8 },
  categoryTitle: { fontSize: 18, fontWeight: "800" },
  item: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  image: { width: 64, height: 64, borderRadius: 8, backgroundColor: Colors.background },
  imageFallback: { backgroundColor: "#eee" },
  itemName: { fontWeight: "700" },
  itemMeta: { color: Colors.textSecondary, marginTop: 4 },
});
