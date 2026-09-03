import { resolveMediaUrl } from "@/lib/kitchen/media-url";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { Radii } from "@naijajollof/ui";
import { useState } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export function ItemThumb({
  uri,
  size = 48,
  style,
}: {
  uri: string | null | undefined;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useKitchenTheme();
  const resolved = resolveMediaUrl(uri);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: Math.min(Radii.sm, size / 4),
          backgroundColor: colors.backgroundWash,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {!loaded || failed || !resolved ? (
        <View
          style={[
            styles.placeholder,
            { backgroundColor: colors.backgroundWash },
          ]}
        />
      ) : null}
      {resolved && !failed ? (
        <Image
          source={{ uri: resolved }}
          style={[styles.image, { opacity: loaded ? 1 : 0 }]}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
