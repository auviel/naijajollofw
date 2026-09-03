import { SafeScreen } from "@/components/kitchen/safe-screen";
import { KType } from "@/lib/kitchen/typography";
import { useAuth } from "@/lib/auth";
import { registerStaffPushDevice } from "@/lib/push";
import { API_URL } from "@/lib/config";
import { Button, GlassSurface } from "@naijajollof/ui";
import { StyleSheet, Text } from "react-native";

export default function AccountScreen() {
  const { user, store, signOut } = useAuth();

  return (
    <SafeScreen>
      <GlassSurface interactive style={styles.card}>
        <Text style={KType.kicker}>Signed in</Text>
        <Text style={KType.page}>{user?.name}</Text>
        <Text style={KType.meta}>{user?.email}</Text>
        <Text style={KType.meta}>{store?.name ?? user?.storeName}</Text>
        <Text style={styles.api}>API · {API_URL}</Text>
        <Button
          variant="secondary"
          label="Enable order notifications"
          onPress={() => void registerStaffPushDevice()}
        />
        <Button label="Sign out" onPress={() => void signOut()} />
      </GlassSurface>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  card: { margin: 20, padding: 18, gap: 8 },
  api: { ...KType.caption, marginTop: 2, marginBottom: 6 },
});
