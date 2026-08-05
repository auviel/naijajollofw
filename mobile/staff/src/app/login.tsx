import { useAuth } from "@/lib/auth";
import { Button, Colors, Field, GlassSurface, Screen, Type } from "@naijajollof/ui";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from "react-native";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <GlassSurface style={styles.card} interactive>
          <Text style={Type.kicker}>Staff</Text>
          <Text style={Type.display}>Kitchen</Text>
          <Text style={Type.meta}>Sign in to run the board from your phone.</Text>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            secureTextEntry
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            disabled={busy || !email || !password}
            label={busy ? "Signing in…" : "Sign in"}
            onPress={() => void onSubmit()}
          />
        </GlassSurface>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24 },
  card: { padding: 24, gap: 12 },
  error: { color: Colors.danger, fontWeight: "600" },
});
