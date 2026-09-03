import { Colors, Radii, Shadows } from "./theme";
import { useUiColors } from "./theme-context";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function Card({ children, style, onPress }: Props) {
  const colors = useUiColors();
  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: "rgba(204,84,0,0.08)" }}
        style={({ pressed }: { pressed: boolean }) => [
          ...cardStyle,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.md,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.card,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
});
