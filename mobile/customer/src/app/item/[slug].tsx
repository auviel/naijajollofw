import { apiFetch } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatCadFromCents, type CartView } from "@naijajollof/api-types";
import { Button, Colors, ItemScreenSkeleton, Radii, Screen, Type } from "@naijajollof/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
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
    slug: string;
    name: string;
    description: string | null;
    priceCents: number;
    imageUrl: string | null;
    available: boolean;
    modifierGroups: Array<{
      id: string;
      name: string;
      required: boolean;
      minSelect: number;
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
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { refresh } = useCart();
  const [data, setData] = useState<ItemPayload | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    apiFetch<ItemPayload>(`/api/storefront/menu/${slug}`)
      .then(setData)
      .catch(() => undefined);
  }, [slug]);

  const extraCents = useMemo(() => {
    if (!data) return 0;
    const chosen = new Set(Object.values(selected).flat());
    return data.item.modifierGroups
      .flatMap((group) => group.modifiers)
      .filter((mod) => chosen.has(mod.id))
      .reduce((sum, mod) => sum + mod.priceDeltaCents, 0);
  }, [data, selected]);

  if (!data) {
    return (
      <Screen>
        <ItemScreenSkeleton />
      </Screen>
    );
  }

  const { item } = data;

  function toggle(groupId: string, modifierId: string, maxSelect: number) {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(modifierId)) {
        return { ...prev, [groupId]: current.filter((value) => value !== modifierId) };
      }
      const next = maxSelect <= 1 ? [modifierId] : [...current, modifierId].slice(-maxSelect);
      return { ...prev, [groupId]: next };
    });
  }

  async function addToCart() {
    for (const group of item.modifierGroups) {
      const count = selected[group.id]?.length ?? 0;
      if ((group.required || group.minSelect > 0) && count < Math.max(1, group.minSelect)) {
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
          quantity: qty,
          modifierIds: Object.values(selected).flat(),
        }),
      });
      await refresh();
      router.push("/cart");
    } catch (err) {
      Alert.alert("Could not add", err instanceof Error ? err.message : "Try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
    <ScrollView contentContainerStyle={styles.content}>
      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.hero} /> : null}
      <Text style={Type.display}>{item.name}</Text>
      <Text style={styles.price}>
        {formatCadFromCents((item.priceCents + extraCents) * qty)}
      </Text>
      {item.description ? <Text style={Type.meta}>{item.description}</Text> : null}

      {item.modifierGroups.map((group) => (
        <View key={group.id} style={styles.group}>
          <Text style={styles.groupName}>
            {group.name}
            {group.required || group.minSelect > 0 ? " *" : ""}
          </Text>
          {group.modifiers.map((mod) => {
            const on = (selected[group.id] ?? []).includes(mod.id);
            return (
              <Pressable
                key={mod.id}
                disabled={!mod.available}
                onPress={() => toggle(group.id, mod.id, group.maxSelect)}
                style={[styles.mod, on && styles.modOn, !mod.available && { opacity: 0.45 }]}
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

      <View style={styles.qtyRow}>
        <Pressable onPress={() => setQty((value) => Math.max(1, value - 1))} style={styles.qtyBtn}>
          <Text style={styles.qtyLabel}>−</Text>
        </Pressable>
        <Text style={styles.qty}>{qty}</Text>
        <Pressable onPress={() => setQty((value) => Math.min(99, value + 1))} style={styles.qtyBtn}>
          <Text style={styles.qtyLabel}>+</Text>
        </Pressable>
      </View>

      <Button
        disabled={!item.available || busy}
        label={!item.available ? "Sold out" : busy ? "Adding…" : "Add to cart"}
        onPress={() => void addToCart()}
      />
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  hero: { width: "100%", height: 220, borderRadius: Radii.lg, backgroundColor: "#eee" },
  price: { fontSize: 18, fontWeight: "800", color: Colors.accent },
  group: { gap: 8, marginTop: 8 },
  groupName: { fontWeight: "800" },
  mod: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.sm,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modOn: { borderColor: Colors.accent, backgroundColor: "#fff1e8" },
  modName: { fontWeight: "600", flex: 1, paddingRight: 8 },
  modPrice: { color: Colors.textSecondary },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 8 },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyLabel: { fontSize: 22, fontWeight: "800", color: Colors.accent },
  qty: { fontSize: 18, fontWeight: "800", minWidth: 24, textAlign: "center" },
});
