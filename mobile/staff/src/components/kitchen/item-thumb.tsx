import { resolveMediaUrl } from "@/lib/kitchen/media-url";
import { Colors, Radii } from "@naijajollof/ui";
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
  const resolved = resolveMediaUrl(uri);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: Math.min(Radii.sm, size / 4) },
        style,
      ]}
    >
      {!loaded || failed || !resolved ? (
        <View style={styles.placeholder} />
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
    backgroundColor: Colors.backgroundWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.backgroundWash,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
