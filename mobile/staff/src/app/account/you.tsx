import { StackScroll } from "@/components/kitchen/stack-scroll";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { KType } from "@/lib/kitchen/typography";
import { Button, Card, Colors, Field, Screen } from "@naijajollof/ui";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

function humanizeRole(role: string | undefined): string {
  if (!role) return "—";
  if (role === "STORE_MANAGER") return "Store manager";
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AccountYouScreen() {
  const { user, refreshMe } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phoneE164 ?? "");
  const [saving, setSaving] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [confirmingEmail, setConfirmingEmail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phoneE164 ?? "");
  }, [user?.name, user?.email, user?.phoneE164]);

  async function saveProfile() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiFetch<{
        user: { name: string; email: string; phoneE164: string | null };
        emailChangePending: boolean;
      }>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim().toLowerCase(),
        }),
      });
      await refreshMe();
      if (result.emailChangePending) {
        setPendingEmail(email.trim().toLowerCase());
        setMessage(`We sent a code to ${email.trim().toLowerCase()}. Enter it below to confirm.`);
      } else {
        setPendingEmail(null);
        setMessage("Profile saved.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmEmail() {
    setConfirmingEmail(true);
    setError(null);
    try {
      await apiFetch("/api/account/email/confirm", {
        method: "POST",
        body: JSON.stringify({ code: emailCode.trim() }),
      });
      await refreshMe();
      setPendingEmail(null);
      setEmailCode("");
      setMessage("Email updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to confirm email.");
    } finally {
      setConfirmingEmail(false);
    }
  }

  return (
    <Screen>
      <StackScroll>
        <Card style={styles.card}>
          <Text style={KType.kicker}>Profile</Text>
          <View style={styles.fieldBlock}>
            <Text style={KType.meta}>Name</Text>
            <Field value={name} onChangeText={setName} autoCapitalize="words" />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={KType.meta}>Email</Text>
            <Field
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={KType.meta}>Phone</Text>
            <Field
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+1…"
            />
          </View>
          <Text style={KType.meta}>Role · {humanizeRole(user?.role)}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.ok}>{message}</Text> : null}
          <Button
            label={saving ? "Saving…" : "Save"}
            disabled={saving}
            onPress={() => void saveProfile()}
          />
          {saving ? <ActivityIndicator color={Colors.accent} /> : null}
        </Card>

        {pendingEmail ? (
          <Card style={styles.card}>
            <Text style={KType.kicker}>Confirm email</Text>
            <Text style={KType.meta}>
              Enter the 6-digit code sent to {pendingEmail}.
            </Text>
            <Field
              value={emailCode}
              onChangeText={setEmailCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
            />
            <Button
              label={confirmingEmail ? "Confirming…" : "Confirm email"}
              disabled={confirmingEmail || emailCode.trim().length !== 6}
              onPress={() => void confirmEmail()}
            />
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text style={KType.kicker}>Security</Text>
          <Pressable
            style={styles.row}
            onPress={() => router.push("/account/change-password")}
            accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <Text style={KType.bodyStrong}>Change password</Text>
              <Text style={KType.meta}>Email a 6-digit code</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={[styles.row, styles.rowDisabled]}
            disabled
            onPress={() =>
              Alert.alert("Coming soon", "Passkeys aren’t available yet.")
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[KType.bodyStrong, styles.muted]}>Passkeys</Text>
              <Text style={KType.meta}>Coming soon</Text>
            </View>
          </Pressable>
        </Card>
      </StackScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  fieldBlock: { gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  rowDisabled: { opacity: 0.7 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  chevron: {
    ...KType.section,
    color: Colors.textSecondary,
    fontWeight: "400",
  },
  muted: { color: Colors.textSecondary },
  error: { ...KType.meta, color: Colors.danger },
  ok: { ...KType.meta, color: Colors.success },
});
