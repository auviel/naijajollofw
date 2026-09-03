import { openMapsAddress, openTel } from "@/lib/kitchen/linking";
import { Colors } from "@naijajollof/ui";
import { KType } from "@/lib/kitchen/typography";
import { Pressable, StyleSheet, Text } from "react-native";

export function TelLink({
  phone,
  label,
}: {
  phone: string;
  label?: string;
}) {
  return (
    <Pressable
      onPress={() => void openTel(phone)}
      accessibilityRole="link"
      accessibilityLabel={`Call ${label ?? phone}`}
      hitSlop={6}
    >
      <Text style={styles.link}>{label ?? phone}</Text>
    </Pressable>
  );
}

export function MapsLink({ address }: { address: string }) {
  return (
    <Pressable
      onPress={() => void openMapsAddress(address)}
      accessibilityRole="link"
      accessibilityLabel={`Open ${address} in Maps`}
      hitSlop={6}
    >
      <Text style={styles.link}>{address}</Text>
      <Text style={styles.hint}>Open in Maps</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { ...KType.body, color: Colors.accent },
  hint: { ...KType.meta, color: Colors.accent, marginTop: 2 },
});
