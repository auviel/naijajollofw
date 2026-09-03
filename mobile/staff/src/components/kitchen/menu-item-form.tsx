import { IconBtn } from "@/components/kitchen/icon-btn";
import { MenuItemPhotos } from "@/components/kitchen/menu-item-photos";
import type {
  KitchenMenuCategoryOption,
  KitchenMenuImage,
} from "@/lib/kitchen/menu-types";
import {
  centsToDollarsInput,
  dollarsToCents,
} from "@/lib/kitchen/menu-types";
import { DarkPalette, useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { Button, Card, Field, Radii } from "@naijajollof/ui";
import { useEffect, useMemo, useState } from "react";
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
  /** Start in read-only view with pencil (edit screens). Create stays always-form. */
  viewEdit?: boolean;
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
  viewEdit = false,
  onSubmit,
}: MenuItemFormProps) {
  const { colors } = useKitchenTheme();
  const styles = useThemedStyles((c) => {
    const dark = c.background === DarkPalette.background;
    return {
      wrap: { gap: 14, paddingBottom: 24 },
      card: { gap: 12 },
      cardHead: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
      },
      fieldBlock: { gap: 6 },
      multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" as const },
      infoBlock: { gap: 6 },
      switchRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 12,
      },
      divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: c.border,
        marginVertical: 2,
      },
      chips: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
      chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Radii.sm,
        backgroundColor: dark ? c.surfaceElevated : c.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
      },
      chipSelected: {
        backgroundColor: c.accentSoft,
        borderColor: dark ? "rgba(255,143,74,0.45)" : c.border,
      },
      chipLabel: { ...KType.meta, color: c.textSecondary },
      chipLabelSelected: { ...KType.metaStrong, color: c.accent },
      error: { ...KType.meta, color: c.danger },
    };
  });
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [priceDollars, setPriceDollars] = useState(initial.priceDollars);
  const [available, setAvailable] = useState(initial.available);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [editing, setEditing] = useState(!viewEdit);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setName(initial.name);
    setDescription(initial.description);
    setPriceDollars(initial.priceDollars);
    setAvailable(initial.available);
    setCategoryId(initial.categoryId);
    if (viewEdit) setEditing(false);
  }, [initial, viewEdit]);

  const dirty = useMemo(
    () =>
      name.trim() !== initial.name.trim() ||
      description.trim() !== initial.description.trim() ||
      priceDollars.trim() !== initial.priceDollars.trim() ||
      available !== initial.available ||
      categoryId !== initial.categoryId,
    [name, description, priceDollars, available, categoryId, initial],
  );

  function cancelEdit() {
    setName(initial.name);
    setDescription(initial.description);
    setPriceDollars(initial.priceDollars);
    setAvailable(initial.available);
    setCategoryId(initial.categoryId);
    setLocalError(null);
    setEditing(false);
  }

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
  const categoryName =
    categories.find((c) => c.id === categoryId)?.name ?? "—";
  const showSave = !viewEdit || (editing && dirty);

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={KType.kicker}>Item</Text>
          {viewEdit ? (
            editing ? (
              <IconBtn
                name="close"
                color={colors.text}
                label="Cancel editing"
                onPress={cancelEdit}
                soft
              />
            ) : (
              <IconBtn
                name="create-outline"
                color={colors.accent}
                label="Edit item"
                onPress={() => setEditing(true)}
                soft
              />
            )
          ) : null}
        </View>

        {editing ? (
          <>
            <View style={styles.fieldBlock}>
              <Text style={KType.meta}>Name</Text>
              <Field
                value={name}
                onChangeText={setName}
                autoCapitalize="sentences"
              />
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
            <View style={styles.divider} />
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
          </>
        ) : (
          <View style={styles.infoBlock}>
            <Text style={KType.bodyStrong}>{initial.name || "—"}</Text>
            <Text style={KType.numeric}>${initial.priceDollars}</Text>
            <Text style={KType.meta}>
              {initial.description.trim()
                ? initial.description
                : "No description"}
            </Text>
            <Text style={KType.meta}>
              {initial.available ? "Available" : "Unavailable"}
              {" · "}
              {categoryName}
            </Text>
          </View>
        )}
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

      {showSave ? (
        <Button
          label={busy ? "Saving…" : submitLabel}
          disabled={busy}
          onPress={submit}
        />
      ) : null}
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
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  infoBlock: { gap: 4 },
  fieldBlock: { gap: 6 },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 2,
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
