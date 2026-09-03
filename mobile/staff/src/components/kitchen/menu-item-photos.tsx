import { apiFetch, apiUpload } from "@/lib/api";
import type {
  KitchenMenuImage,
  UploadMenuImageResult,
} from "@/lib/kitchen/menu-types";
import { DarkPalette, useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { Radii } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type MenuItemPhotosProps = {
  itemId: string;
  images: KitchenMenuImage[];
  onChange: (images: KitchenMenuImage[]) => void;
};

export function MenuItemPhotos({
  itemId,
  images,
  onChange,
}: MenuItemPhotosProps) {
  const { colors } = useKitchenTheme();
  const styles = useThemedStyles((c) => {
    const dark = c.background === DarkPalette.background;
    return {
      wrap: { gap: 10 },
      row: { gap: 10, alignItems: "center" as const, paddingVertical: 4 },
      thumbWrap: { position: "relative" as const },
      thumb: {
        width: 72,
        height: 72,
        borderRadius: Radii.sm,
        backgroundColor: c.backgroundWash,
      },
      deleteBtn: {
        position: "absolute" as const,
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: c.danger,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      add: {
        width: 72,
        height: 72,
        borderRadius: Radii.sm,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
        backgroundColor: dark ? c.surfaceElevated : c.surface,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 4,
      },
      error: { ...KType.meta, color: c.danger },
    };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAndUpload() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photos needed",
        "Allow photo library access to add menu images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const mime = asset.mimeType ?? "image/jpeg";
    const ext =
      mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/gif"
            ? "gif"
            : "jpg";

    const formData = new FormData();
    formData.append(
      "file",
      {
        uri: asset.uri,
        name: `menu.${ext}`,
        type: mime,
      } as unknown as Blob,
    );

    setBusy(true);
    try {
      const uploaded = await apiUpload<UploadMenuImageResult>(
        `/api/menu/items/${itemId}/image`,
        formData,
      );
      onChange([
        ...images,
        {
          id: uploaded.imageId,
          url: uploaded.imageUrl,
          sortOrder: images.length,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteImage(imageId: string) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/menu/items/${itemId}/images/${imageId}`, {
        method: "DELETE",
      });
      onChange(images.filter((img) => img.id !== imageId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={KType.kicker}>Photos</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {images.map((img) => (
          <View key={img.id} style={styles.thumbWrap}>
            <Image
              source={{ uri: img.url }}
              style={styles.thumb}
              contentFit="cover"
            />
            <Pressable
              style={styles.deleteBtn}
              disabled={busy}
              onPress={() =>
                Alert.alert("Remove photo?", undefined, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => void deleteImage(img.id),
                  },
                ])
              }
              accessibilityLabel="Remove photo"
            >
              <Ionicons name="close" size={14} color={colors.inverse} />
            </Pressable>
          </View>
        ))}
        <Pressable
          style={styles.add}
          disabled={busy}
          onPress={() => void pickAndUpload()}
          accessibilityRole="button"
          accessibilityLabel="Add photo"
        >
          <Ionicons
            name="image-outline"
            size={22}
            color={colors.textSecondary}
          />
          <Text style={[KType.meta, { color: colors.textSecondary }]}>
            {busy ? "…" : "Add"}
          </Text>
        </Pressable>
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
