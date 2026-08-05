import { Colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { registerStaffPushDevice } from "@/lib/push";
import { API_URL } from "@/lib/config";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function AccountScreen() {
  const { user, store, signOut } = useAuth();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Signed in</Text>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <Text style={styles.meta}>{store?.name ?? user?.storeName}</Text>
      <Text style={styles.api}>API · {API_URL}</Text>

      <Pressable
        style={styles.secondary}
        onPress={() => void registerStaffPushDevice()}
      >
        <Text style={styles.secondaryText}>Enable order notifications</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, gap: 8, backgroundColor: Colors.background },
  label: { color: Colors.textSecondary, textTransform: "uppercase", fontSize: 12, fontWeight: "700" },
  name: { fontSize: 24, fontWeight: "800", color: Colors.text },
  meta: { color: Colors.textSecondary },
  api: { marginTop: 12, color: Colors.textSecondary, fontSize: 12 },
  secondary: {
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { fontWeight: "700" },
  button: {
    marginTop: 12,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: Colors.inverse, fontWeight: "800" },
});
