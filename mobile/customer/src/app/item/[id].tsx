import { Colors } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { formatCadFromCents, type CartView } from "@naijajollof/api-types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ItemPayload = {
  item: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
    imageUrl: string | null;
    available: boolean;
    modifierGroups: Array<{
      id: string;
      name: string;
      required: boolean;
      maxSelect: number;
      modifiers: Array<{
        id: string;
        name: string;
        priceDeltaCents: number;
        available: boolean;
      }>;
    }>;
  };
};

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ItemPayload | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch<ItemPayload>(`/api/storefront/menu/${id}`).then(setData).catch(() => undefined);
  }, [id]);

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const { item } = data;

  function toggle(groupId: string, modifierId: string, maxSelect: number) {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(modifierId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modifierId) };
      }
      const next = maxSelect <= 1 ? [modifierId] : [...current, modifierId].slice(-maxSelect);
      return { ...prev, [groupId]: next };
    });
  }

  async function addToCart() {
    for (const group of item.modifierGroups) {
      const count = selected[group.id]?.length ?? 0;
      if (group.required && count === 0) {
        Alert.alert("Choose options", `Select ${group.name} first.`);
        return;
      }
    }
    setBusy(true);
    try {
      await apiFetch<CartView>("/api/cart", {
        method: "POST",
        body: JSON.stringify({
          menuItemId: item.id,
          quantity: 1,
          modifierIds: Object.values(selected).flat(),
        }),
      });
      router.push("/cart");
    } catch (err) {
      Alert.alert("Could not add", err instanceof Error ? err.message : "Try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.hero} /> : null}
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>{formatCadFromCents(item.priceCents)}</Text>
      {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

      {item.modifierGroups.map((group) => (
        <View key={group.id} style={styles.group}>
          <Text style={styles.groupName}>
            {group.name}
            {group.required ? " *" : ""}
          </Text>
          {group.modifiers.map((mod) => {
            const on = (selected[group.id] ?? []).includes(mod.id);
            return (
              <Pressable
                key={mod.id}
                disabled={!mod.available}
                onPress={() => toggle(group.id, mod.id, group.maxSelect)}
                style={[styles.mod, on && styles.modOn]}
              >
                <Text style={styles.modName}>{mod.name}</Text>
                <Text style={styles.modPrice}>
                  {mod.priceDeltaCents ? `+${formatCadFromCents(mod.priceDeltaCents)}` : "Included"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      <Pressable
        disabled={!item.available || busy}
        onPress={() => void addToCart()}
        style={[styles.button, (!item.available || busy) && { opacity: 0.5 }]}
      >
        <Text style={styles.buttonText}>
          {!item.available ? "Sold out" : busy ? "Adding…" : "Add to cart"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  hero: { width: "100%", height: 200, borderRadius: 16, backgroundColor: "#eee" },
  name: { fontSize: 26, fontWeight: "800" },
  price: { fontSize: 18, fontWeight: "700", color: Colors.accent },
  desc: { color: Colors.textSecondary },
  group: { gap: 8, marginTop: 8 },
  groupName: { fontWeight: "800" },
  mod: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modOn: { borderColor: Colors.accent, backgroundColor: "#fff1e8" },
  modName: { fontWeight: "600" },
  modPrice: { color: Colors.textSecondary },
  button: {
    marginTop: 12,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: { color: Colors.inverse, fontWeight: "800", fontSize: 16 },
});
