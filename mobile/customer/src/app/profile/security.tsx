import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Colors, Field, Screen, Type } from "@naijajollof/ui";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

export default function SecurityScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);

  async function afterCredentialChange(message: string) {
    await signOut();
    router.replace("/login");
    return message;
  }

  async function changeEmail() {
    setEmailBusy(true);
    setEmailError(null);
    setEmailMessage(null);
    try {
      const data = await apiFetch<{ email: string; message: string }>(
        "/api/diner/change-email",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), password: emailPassword }),
        },
      );
      setEmailMessage(await afterCredentialChange(data.message));
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Could not update email");
    } finally {
      setEmailBusy(false);
    }
  }

  async function changePassword() {
    setPasswordBusy(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      const data = await apiFetch<{ ok: boolean; message: string }>(
        "/api/diner/change-password",
        {
          method: "POST",
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        },
      );
      setPasswordMessage(await afterCredentialChange(data.message));
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Could not update password",
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={Type.display}>Security</Text>
        {!user?.emailVerified ? (
          <>
            <Text style={styles.warn}>Your email is not verified yet.</Text>
            <Button
              variant="secondary"
              disabled={verifyBusy}
              label={verifyBusy ? "Sending…" : "Resend verification email"}
              onPress={() => {
                setVerifyBusy(true);
                void apiFetch<{ message: string }>("/api/diner/verify-email/resend", {
                  method: "POST",
                })
                  .then((data) => setEmailMessage(data.message))
                  .catch((err: unknown) =>
                    setEmailError(
                      err instanceof Error ? err.message : "Could not resend",
                    ),
                  )
                  .finally(() => setVerifyBusy(false));
              }}
            />
          </>
        ) : null}

        <Text style={Type.headline}>Change email</Text>
        <Text style={Type.meta}>You’ll be signed out on this device afterward.</Text>
        <Field
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="New email"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          secureTextEntry
          placeholder="Current password"
          value={emailPassword}
          onChangeText={setEmailPassword}
        />
        {emailError ? <Text style={styles.err}>{emailError}</Text> : null}
        {emailMessage ? <Text style={styles.ok}>{emailMessage}</Text> : null}
        <Button
          disabled={emailBusy || !email.trim() || !emailPassword}
          label={emailBusy ? "Saving…" : "Update email"}
          onPress={() => void changeEmail()}
        />

        <Text style={Type.headline}>Change password</Text>
        <Text style={Type.meta}>You’ll be signed out on this device afterward.</Text>
        <Field
          secureTextEntry
          placeholder="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <Field
          secureTextEntry
          placeholder="New password (8+)"
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <Field
          secureTextEntry
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {passwordError ? <Text style={styles.err}>{passwordError}</Text> : null}
        {passwordMessage ? <Text style={styles.ok}>{passwordMessage}</Text> : null}
        <Button
          disabled={
            passwordBusy ||
            !currentPassword ||
            newPassword.length < 8 ||
            !confirmPassword
          }
          label={passwordBusy ? "Saving…" : "Update password"}
          onPress={() => void changePassword()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12, paddingBottom: 40 },
  err: { color: Colors.danger },
  ok: { color: Colors.success, fontWeight: "700" },
  warn: { color: Colors.accent, fontWeight: "700" },
});
