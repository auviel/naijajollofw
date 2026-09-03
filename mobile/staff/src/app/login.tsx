import { PasswordField } from "@/components/kitchen/password-field";
import { useAuth } from "@/lib/auth";
import { emailLooksValid } from "@/lib/kitchen/linking";
import { KType } from "@/lib/kitchen/typography";
import { Button, Colors, Field, GlassSurface, Radii } from "@naijajollof/ui";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const loginHero = require("../../assets/login-jollof.png");

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(
    () => emailLooksValid(email) && password.length > 0 && !busy,
    [email, password, busy],
  );

  async function onSubmit() {
    if (!canSubmit) return;
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
    <View style={styles.root}>
      <StatusBar style="light" />
      <ImageBackground
        source={loginHero}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.scrim} />

      <KeyboardAvoidingView
        style={[
          styles.wrap,
          {
            paddingTop: insets.top + 24,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.brand}>
          <Text style={styles.brandName}>Naija Jollof</Text>
          <Text style={styles.brandLine}>Kitchen staff</Text>
        </View>

        <GlassSurface style={styles.card} interactive>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Email</Text>
            <Field
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@store.com"
              value={email}
              onChangeText={setEmail}
              textContentType="username"
              autoComplete="email"
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Password</Text>
            <PasswordField
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              textContentType="password"
              autoComplete="password"
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            disabled={!canSubmit}
            label={busy ? "Signing in…" : "Sign in"}
            onPress={() => void onSubmit()}
          />
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/forgot-password",
                params: email.trim() ? { email: email.trim() } : undefined,
              })
            }
            hitSlop={8}
            accessibilityRole="link"
          >
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
        </GlassSurface>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1a1210" },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(24, 18, 16, 0.45)",
  },
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    gap: 28,
  },
  brand: { gap: 6, paddingHorizontal: 4 },
  brandName: {
    ...KType.page,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: Colors.inverse,
  },
  brandLine: {
    ...KType.metaStrong,
    color: "rgba(255,255,255,0.82)",
  },
  card: {
    padding: 22,
    gap: 14,
    borderRadius: Radii.lg,
  },
  fieldBlock: { gap: 6 },
  label: { ...KType.metaStrong, color: Colors.text },
  error: { ...KType.metaStrong, color: Colors.danger },
  forgot: {
    ...KType.metaStrong,
    color: Colors.accent,
    textAlign: "center",
    paddingVertical: 4,
  },
});
