import { openMapsAddress, openTel } from "@/lib/kitchen/linking";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export function TelLink({
  phone,
  label,
}: {
  phone: string;
  label?: string;
}) {
  const { colors } = useKitchenTheme();
  return (
    <Pressable
      onPress={() => void openTel(phone)}
      accessibilityRole="link"
      accessibilityLabel={`Call ${label ?? phone}`}
      hitSlop={6}
    >
      <Text style={[KType.body, { color: colors.accent }]}>
        {label ?? phone}
      </Text>
    </Pressable>
  );
}

export function MapsLink({ address }: { address: string }) {
  const { colors } = useKitchenTheme();
  return (
    <Pressable
      onPress={() => void openMapsAddress(address)}
      accessibilityRole="link"
      accessibilityLabel={`Open ${address} in Maps`}
      hitSlop={6}
    >
      <Text style={[KType.body, { color: colors.accent }]}>{address}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginTop: 2,
        }}
      >
        <Text style={[KType.meta, { color: colors.accent }]}>Open in Maps</Text>
        <Ionicons name="open-outline" size={14} color={colors.accent} />
      </View>
    </Pressable>
  );
}
