import { TurnstileField } from "@/components/turnstile";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Colors, Field, Screen, Type } from "@naijajollof/ui";
import type { MobilePublicConfig } from "@naijajollof/api-types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [publicConfig, setPublicConfig] = useState<MobilePublicConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiFetch<MobilePublicConfig>("/api/mobile/public-config")
      .then(setPublicConfig)
      .catch(() =>
        setPublicConfig({ turnstileSiteKey: null, turnstileEnabled: false }),
      );
  }, []);

  const needsTurnstile = Boolean(
    publicConfig?.turnstileEnabled && publicConfig.turnstileSiteKey,
  );

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      if (needsTurnstile && !turnstileToken) {
        setError("Complete the security check and try again.");
        return;
      }
      await apiFetch("/api/diner/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          turnstileToken: turnstileToken ?? undefined,
        }),
      });
      await signIn(email.trim(), password);
      router.replace("/(tabs)/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
      setTurnstileToken(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.wrap}>
          <Text style={Type.display}>Create account</Text>
          <Text style={Type.meta}>
            Faster checkout and order history. Guest ordering still works without this.
          </Text>
          <Field placeholder="Name" value={name} onChangeText={setName} />
          <Field
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            keyboardType="phone-pad"
            placeholder="Phone"
            value={phone}
            onChangeText={setPhone}
          />
          <Field
            secureTextEntry
            placeholder="Password (8+ characters)"
            value={password}
            onChangeText={setPassword}
          />
          {needsTurnstile && publicConfig?.turnstileSiteKey ? (
            <TurnstileField
              siteKey={publicConfig.turnstileSiteKey}
              onToken={setTurnstileToken}
            />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            disabled={
              busy ||
              !name ||
              !email ||
              !phone ||
              password.length < 8 ||
              (needsTurnstile && !turnstileToken)
            }
            label={busy ? "Creating…" : "Create account"}
            onPress={() => void onSubmit()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12, paddingBottom: 40 },
  error: { color: Colors.danger },
});
