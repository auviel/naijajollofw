import { SafeScreen } from "@/components/kitchen/safe-screen";
import { KType } from "@/lib/kitchen/typography";
import { Colors, GlassSurface } from "@naijajollof/ui";
import { StyleSheet, Text } from "react-native";

export default function MenuTab() {
  return (
    <SafeScreen>
      <GlassSurface style={styles.card}>
        <Text style={KType.kicker}>Coming next</Text>
        <Text style={KType.page}>Menu</Text>
        <Text style={styles.body}>
          Update prices, edit items, and add new dishes from the kitchen phone —
          after the Board is solid.
        </Text>
      </GlassSurface>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  card: { margin: 20, padding: 18, gap: 8 },
  body: {
    ...KType.body,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
