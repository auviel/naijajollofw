import { useAuth } from "@/lib/auth";
import { registerStaffPushDevice } from "@/lib/push";
import { API_URL } from "@/lib/config";
import { Button, Card, Screen, Type } from "@naijajollof/ui";
import { StyleSheet, Text } from "react-native";

export default function AccountScreen() {
  const { user, store, signOut } = useAuth();

  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={Type.kicker}>Signed in</Text>
        <Text style={Type.display}>{user?.name}</Text>
        <Text style={Type.meta}>{user?.email}</Text>
        <Text style={Type.meta}>{store?.name ?? user?.storeName}</Text>
        <Text style={styles.api}>API · {API_URL}</Text>
        <Button
          variant="secondary"
          label="Enable order notifications"
          onPress={() => void registerStaffPushDevice()}
        />
        <Button label="Sign out" onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { margin: 20, gap: 10 },
  api: { marginTop: 4, color: "#6B574C", fontSize: 12 },
});
