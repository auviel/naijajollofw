import { StackScroll } from "@/components/kitchen/stack-scroll";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { KType } from "@/lib/kitchen/typography";
import { Button, Card, Colors, Field, Screen } from "@naijajollof/ui";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type Step = "request" | "confirm" | "done";

export default function ChangePasswordScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/account/password/otp", { method: "POST" });
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/account/password/confirm", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim(),
          newPassword,
          confirmPassword,
        }),
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <StackScroll>
        <Card style={styles.card}>
          {step === "request" ? (
            <>
              <Text style={KType.bodyStrong}>Change password</Text>
              <Text style={KType.meta}>
                We’ll email a 6-digit code to {user?.email ?? "your account"}.
              </Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                label={busy ? "Sending…" : "Send code"}
                disabled={busy}
                onPress={() => void sendCode()}
              />
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <Text style={KType.bodyStrong}>Enter code & new password</Text>
              <Text style={KType.meta}>
                Check your email for the 6-digit code. It expires in 10 minutes.
              </Text>
              <View style={styles.fieldBlock}>
                <Text style={KType.meta}>Code</Text>
                <Field
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={KType.meta}>New password</Text>
                <Field
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={KType.meta}>Confirm password</Text>
                <Field
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button
                label={busy ? "Saving…" : "Update password"}
                disabled={busy}
                onPress={() => void confirm()}
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
                Your other sessions were signed out. Sign in again with your new
                password.
              </Text>
              <Button
                label="Sign in again"
                onPress={() => {
                  void signOut().then(() => router.replace("/login"));
                }}
              />
            </>
          ) : null}
        </Card>
      </StackScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  fieldBlock: { gap: 6 },
  error: { ...KType.meta, color: Colors.danger },
});
