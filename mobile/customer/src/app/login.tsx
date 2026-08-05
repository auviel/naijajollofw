import { TurnstileField } from "@/components/turnstile";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Colors, Field, GlassSurface, Screen, Type } from "@naijajollof/ui";
import type { LoginChallenge } from "@naijajollof/api-types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      setChallenge(null);
      return;
    }
    const timer = setTimeout(() => {
      void apiFetch<LoginChallenge>("/api/auth/login-challenge", {
        method: "POST",
        body: JSON.stringify({ email: trimmed }),
      })
        .then(setChallenge)
        .catch(() => setChallenge(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [email]);

  const showTurnstile = Boolean(
    challenge?.requiresTurnstile && challenge.turnstileSiteKey,
  );

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      if (showTurnstile && !turnstileToken) {
        setError("Complete the security check and try again.");
        return;
      }
      await signIn(email.trim(), password, turnstileToken ?? undefined);
      router.replace("/(tabs)/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setTurnstileToken(null);
      void apiFetch<LoginChallenge>("/api/auth/login-challenge", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      })
        .then(setChallenge)
        .catch(() => undefined);
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
          <Text style={Type.kicker}>Diner</Text>
          <Text style={Type.title}>Welcome back</Text>
          <Text style={Type.meta}>Use the same account as the website.</Text>
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
          {showTurnstile && challenge?.turnstileSiteKey ? (
            <TurnstileField
              siteKey={challenge.turnstileSiteKey}
              onToken={setTurnstileToken}
            />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            disabled={busy || !email || !password || (showTurnstile && !turnstileToken)}
            label={busy ? "Signing in…" : "Sign in"}
            onPress={() => void onSubmit()}
          />
          <Pressable onPress={() => router.push("/register")}>
            <Text style={styles.link}>Create an account</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/forgot-password")}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>
        </GlassSurface>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 20 },
  card: { padding: 22, gap: 12 },
  error: { color: Colors.danger, fontWeight: "600" },
  link: { color: Colors.success, fontWeight: "700", textAlign: "center" },
});
