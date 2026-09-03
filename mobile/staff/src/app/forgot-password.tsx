import { apiFetch } from "@/lib/api";
import { KType } from "@/lib/kitchen/typography";
import { Button, Colors, Field, GlassSurface, Radii } from "@naijajollof/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
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

type Step = "email" | "reset" | "done";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : "",
  );
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<{ ok: boolean; message: string }>(
        "/api/auth/staff/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim() }),
        },
      );
      setMessage(data.message);
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/auth/staff/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword,
          confirmPassword,
        }),
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
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
          <Text style={styles.brandName}>Reset password</Text>
          <Text style={styles.brandLine}>Kitchen staff</Text>
        </View>

        <GlassSurface style={styles.card} interactive>
          {step === "email" ? (
            <>
              <Text style={KType.meta}>
                We’ll email a 6-digit code if that address has a kitchen
                account.
              </Text>
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
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                disabled={busy || !email.trim()}
                label={busy ? "Sending…" : "Send code"}
                onPress={() => void sendCode()}
              />
            </>
          ) : null}

          {step === "reset" ? (
            <>
              {message ? <Text style={styles.ok}>{message}</Text> : null}
              <Text style={KType.meta}>
                Enter the code and choose a new password. Code expires in 10
                minutes.
              </Text>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Code</Text>
                <Field
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  textContentType="oneTimeCode"
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>New password</Text>
                <Field
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Confirm password</Text>
                <Field
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                disabled={
                  busy ||
                  code.trim().length !== 6 ||
                  newPassword.length < 8 ||
                  !confirmPassword
                }
                label={busy ? "Saving…" : "Update password"}
                onPress={() => void resetPassword()}
              />
              <Button
                variant="ghost"
                label="Resend code"
                disabled={busy}
                onPress={() => void sendCode()}
              />
            </>
          ) : null}

          {step === "done" ? (
            <>
              <Text style={KType.bodyStrong}>Password updated</Text>
              <Text style={KType.meta}>
                Sign in with your new password.
              </Text>
              <Button
                label="Back to sign in"
                onPress={() => router.replace("/login")}
              />
            </>
          ) : null}

          {step !== "done" ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="link"
            >
              <Text style={styles.forgot}>Back to sign in</Text>
            </Pressable>
          ) : null}
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
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
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
  ok: { ...KType.metaStrong, color: Colors.success },
  forgot: {
    ...KType.metaStrong,
    color: Colors.accent,
    textAlign: "center",
    paddingVertical: 4,
  },
});
