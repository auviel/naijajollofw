import { apiFetch } from "@/lib/api";
import { Button, Colors, Field, Screen, Type } from "@naijajollof/ui";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<{ ok: boolean; message: string }>(
        "/api/diner/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim() }),
        },
      );
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={Type.display}>Reset password</Text>
        <Text style={Type.meta}>We’ll email a reset link if that address has an account.</Text>
        <Field
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.ok}>{message}</Text> : null}
        <Button
          disabled={busy || !email}
          label={busy ? "Sending…" : "Send reset link"}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  error: { color: Colors.danger },
  ok: { color: Colors.success, fontWeight: "700" },
});
