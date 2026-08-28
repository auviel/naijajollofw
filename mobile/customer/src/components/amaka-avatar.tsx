import { Colors } from "@naijajollof/ui";
import { Image } from "expo-image";
import { StyleSheet, View, type ViewStyle } from "react-native";

const AMAKA_AVATAR = require("../../assets/amaka-avatar.png");

const SIZE = {
  sm: 32,
  md: 40,
  lg: 48,
} as const;

type AmakaAvatarProps = {
  size?: keyof typeof SIZE;
  style?: ViewStyle;
};

/** Amaka profile avatar — bundled illustration asset. */
export function AmakaAvatar({ size = "md", style }: AmakaAvatarProps) {
  const px = SIZE[size];

  return (
    <View
      style={[
        styles.ring,
        { width: px, height: px, borderRadius: px / 2 },
        style,
      ]}
    >
      <Image
        source={AMAKA_AVATAR}
        accessibilityLabel="Amaka"
        style={{ width: px, height: px, borderRadius: px / 2 }}
        contentFit="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
});
