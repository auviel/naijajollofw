import { Colors } from "./theme";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.root, style]}>
      {/* Quiet neutral depth for glass — no brand color floods */}
      <View pointerEvents="none" style={styles.washTop} />
      <View pointerEvents="none" style={styles.washBottom} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  washTop: {
    position: "absolute",
    top: -140,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  washBottom: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(228,228,231,0.55)",
  },
});
