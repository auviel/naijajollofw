import { MenuItemPhotos } from "@/components/kitchen/menu-item-photos";
import type {
  KitchenMenuCategoryOption,
  KitchenMenuImage,
} from "@/lib/kitchen/menu-types";
import {
  centsToDollarsInput,
  dollarsToCents,
} from "@/lib/kitchen/menu-types";
import { KType } from "@/lib/kitchen/typography";
import { Button, Card, Colors, Field, Radii } from "@naijajollof/ui";
import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

export type MenuItemFormValues = {
  name: string;
  description: string;
  priceDollars: string;
  available: boolean;
  categoryId: string;
};

type MenuItemFormProps = {
  categories: KitchenMenuCategoryOption[];
  initial: MenuItemFormValues;
  /** When set, photo gallery is shown (edit or post-create). */
  itemId?: string | null;
  images?: KitchenMenuImage[];
  onImagesChange?: (images: KitchenMenuImage[]) => void;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: {
    name: string;
    description: string | null;
    priceCents: number;
    available: boolean;
    categoryId: string;
  }) => void;
};

export function MenuItemForm({
  categories,
  initial,
  itemId,
  images = [],
  onImagesChange,
  submitLabel,
  busy,
  error,
  onSubmit,
}: MenuItemFormProps) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [priceDollars, setPriceDollars] = useState(initial.priceDollars);
  const [available, setAvailable] = useState(initial.available);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setName(initial.name);
    setDescription(initial.description);
    setPriceDollars(initial.priceDollars);
    setAvailable(initial.available);
    setCategoryId(initial.categoryId);
  }, [initial]);

  function submit() {
    setLocalError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError("Name is required.");
      return;
    }
    if (!categoryId) {
      setLocalError("Choose a category.");
      return;
    }
    const priceCents = dollarsToCents(priceDollars);
    if (priceCents === null) {
      setLocalError("Enter a valid price (e.g. 12.50).");
      return;
    }
    onSubmit({
      name: trimmedName,
      description: description.trim() || null,
      priceCents,
      available,
      categoryId,
    });
  }

  const activeCategories = categories.filter((c) => c.active);

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <Text style={KType.kicker}>Item</Text>
        <View style={styles.fieldBlock}>
          <Text style={KType.meta}>Name</Text>
          <Field value={name} onChangeText={setName} autoCapitalize="sentences" />
        </View>
        <View style={styles.fieldBlock}>
          <Text style={KType.meta}>Price (CAD)</Text>
          <Field
            value={priceDollars}
            onChangeText={setPriceDollars}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </View>
        <View style={styles.fieldBlock}>
          <Text style={KType.meta}>Description</Text>
          <Field
            value={description}
            onChangeText={setDescription}
            multiline
            style={styles.multiline}
            placeholder="Optional"
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={KType.bodyStrong}>Available</Text>
          <Switch value={available} onValueChange={setAvailable} />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={KType.kicker}>Category</Text>
        <View style={styles.chips}>
          {activeCategories.map((cat) => {
            const selected = cat.id === categoryId;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setCategoryId(cat.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    selected && styles.chipLabelSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {activeCategories.length === 0 ? (
          <Text style={KType.meta}>Create a category first.</Text>
        ) : null}
      </Card>

      {itemId && onImagesChange ? (
        <Card style={styles.card}>
          <MenuItemPhotos
            itemId={itemId}
            images={images}
            onChange={onImagesChange}
          />
        </Card>
      ) : null}

      {localError || error ? (
        <Text style={styles.error}>{localError ?? error}</Text>
      ) : null}

      <Button
        label={busy ? "Saving…" : submitLabel}
        disabled={busy}
        onPress={submit}
      />
    </View>
  );
}

export function emptyMenuItemForm(
  categoryId: string,
): MenuItemFormValues {
  return {
    name: "",
    description: "",
    priceDollars: "0.00",
    available: true,
    categoryId,
  };
}

export function menuItemToFormValues(item: {
  name: string;
  description: string | null;
  priceCents: number;
  available: boolean;
  categoryId: string;
}): MenuItemFormValues {
  return {
    name: item.name,
    description: item.description ?? "",
    priceDollars: centsToDollarsInput(item.priceCents),
    available: item.available,
    categoryId: item.categoryId,
  };
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  card: { gap: 12 },
  fieldBlock: { gap: 6 },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.accentSoft },
  chipLabel: { ...KType.meta },
  chipLabelSelected: { ...KType.metaStrong, color: Colors.accent },
  error: { ...KType.meta, color: Colors.danger },
});
