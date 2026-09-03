import { useUiColors } from "./theme-context";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useUiColors();
  return (
    <View
      style={[styles.root, { backgroundColor: colors.background }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
