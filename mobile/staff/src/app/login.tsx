import { SafeScreen } from "@/components/kitchen/safe-screen";
import { KType } from "@/lib/kitchen/typography";
import { useAuth } from "@/lib/auth";
import { Button, Colors, Field, GlassSurface } from "@naijajollof/ui";
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
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <GlassSurface style={styles.card} interactive>
          <Text style={KType.page}>Naija Jollof Kitchen</Text>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            textContentType="username"
            autoComplete="email"
          />
          <Field
            secureTextEntry
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            textContentType="password"
            autoComplete="password"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            disabled={busy || !email || !password}
            label={busy ? "Signing in…" : "Sign in"}
            onPress={() => void onSubmit()}
          />
        </GlassSurface>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24 },
  card: { padding: 24, gap: 12 },
  error: { ...KType.metaStrong, color: Colors.danger },
});
