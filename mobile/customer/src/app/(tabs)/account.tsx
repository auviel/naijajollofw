import { useAuth } from "@/lib/auth";
import { registerDinerPushDevice } from "@/lib/push";
import { Button, Card, Colors, Screen, Type } from "@naijajollof/ui";
import { useRouter } from "expo-router";
import { Alert, Platform, StyleSheet, Text } from "react-native";

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <Screen>
        <Card style={styles.card}>
          <Text style={Type.display}>Account</Text>
          <Text style={Type.meta}>
            Sign in to track orders across devices and get status notifications.
          </Text>
          <Button label="Sign in" onPress={() => router.push("/login")} />
          <Button
            variant="secondary"
            label="Create account"
            onPress={() => router.push("/register")}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={Type.display}>{user.name}</Text>
        <Text style={Type.meta}>{user.email}</Text>
        {user.phoneE164 ? <Text style={Type.meta}>{user.phoneE164}</Text> : null}
        {!user.emailVerified ? (
          <Text style={styles.warn}>Verify your email from the link we sent.</Text>
        ) : null}
        <Button
          variant="secondary"
          label="Addresses"
          onPress={() => router.push("/profile/addresses")}
        />
        <Button
          variant="secondary"
          label="Payment methods"
          onPress={() => router.push("/profile/cards")}
        />
        <Button
          variant="secondary"
          label="Email & password"
          onPress={() => router.push("/profile/security")}
        />
        <Button
          variant="secondary"
          label="Enable order notifications"
          onPress={() => {
            void registerDinerPushDevice()
              .then(() => Alert.alert("Notifications", "Order updates enabled on this device."))
              .catch((err: unknown) =>
                Alert.alert(
                  "Notifications",
                  err instanceof Error ? err.message : "Could not enable notifications.",
                ),
              );
          }}
        />
        <Button label="Sign out" onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 20,
    gap: 12,
    marginBottom: Platform.OS === "android" ? 120 : 20,
  },
  warn: { color: Colors.accent, fontWeight: "700" },
});
