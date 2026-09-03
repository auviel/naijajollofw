import { StackScroll } from "@/components/kitchen/stack-scroll";
import { KType } from "@/lib/kitchen/typography";
import {
  type AppearancePref,
  useKitchenTheme,
} from "@/lib/kitchen/theme";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { kvGet, kvSet } from "@/lib/kv";
import {
  getStaffPushPermissionStatus,
  humanizePushStatus,
  registerStaffPushDevice,
  type PushPermissionStatus,
} from "@/lib/push";
import { Button, Card, Screen } from "@naijajollof/ui";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

const KEY_SOUND = "kitchen.pref.sound";
const KEY_HAPTIC = "kitchen.pref.haptic";

export default function AccountPreferencesScreen() {
  const { appearance, setAppearance, colors } = useKitchenTheme();
  const styles = useThemedStyles((c) => ({
    card: { paddingVertical: 4, gap: 0 },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    pushBlock: { gap: 8, paddingVertical: 12, paddingHorizontal: 4 },
    sectionGap: { marginTop: 12 },
    check: { ...KType.bodyStrong, color: c.accent },
    checkMuted: { ...KType.body, color: c.textSecondary, minWidth: 16 },
  }));

  const [sound, setSound] = useState(true);
  const [haptic, setHaptic] = useState(true);
  const [pushStatus, setPushStatus] =
    useState<PushPermissionStatus>("unknown");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushRegistered, setPushRegistered] = useState(false);

  const refreshPushStatus = useCallback(async () => {
    const status = await getStaffPushPermissionStatus();
    setPushStatus(status);
    return status;
  }, []);

  const syncPushIfAllowed = useCallback(async () => {
    const status = await refreshPushStatus();
    if (status !== "granted") {
      setPushRegistered(false);
      return;
    }
    const result = await registerStaffPushDevice();
    setPushStatus(result.status);
    if (result.ok) {
      setPushRegistered(true);
      setPushMessage(null);
    } else {
      setPushRegistered(false);
      setPushMessage(result.message);
    }
  }, [refreshPushStatus]);

  useEffect(() => {
    void (async () => {
      const [s, h] = await Promise.all([kvGet(KEY_SOUND), kvGet(KEY_HAPTIC)]);
      if (s != null) setSound(s === "1");
      if (h != null) setHaptic(h === "1");
      await syncPushIfAllowed();
    })();
  }, [syncPushIfAllowed]);

  useFocusEffect(
    useCallback(() => {
      void syncPushIfAllowed();
    }, [syncPushIfAllowed]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncPushIfAllowed();
    });
    return () => sub.remove();
  }, [syncPushIfAllowed]);

  const toggleSound = useCallback((value: boolean) => {
    setSound(value);
    void kvSet(KEY_SOUND, value ? "1" : "0");
  }, []);

  const toggleHaptic = useCallback((value: boolean) => {
    setHaptic(value);
    void kvSet(KEY_HAPTIC, value ? "1" : "0");
  }, []);

  async function enablePush() {
    setPushBusy(true);
    setPushMessage(null);
    try {
      const result = await registerStaffPushDevice();
      setPushStatus(result.status);
      if (result.ok) {
        setPushRegistered(true);
        setPushMessage(null);
      } else {
        setPushRegistered(false);
        setPushMessage(result.message);
      }
    } finally {
      setPushBusy(false);
    }
  }

  const appearanceOptions: Array<{ id: AppearancePref; label: string }> = [
    { id: "system", label: "System" },
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ];

  const pushOn = pushStatus === "granted" && pushRegistered;

  return (
    <Screen>
      <StackScroll>
        <Text style={KType.kicker}>Notifications</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={KType.body}>Sound</Text>
            <Switch
              value={sound}
              onValueChange={toggleSound}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={KType.body}>Haptic</Text>
            <Switch
              value={haptic}
              onValueChange={toggleHaptic}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.pushBlock}>
            <Text style={KType.body}>Push</Text>
            <Text style={KType.meta}>
              Status ·{" "}
              {pushOn ? "On for this device" : humanizePushStatus(pushStatus)}
            </Text>
            {pushMessage ? (
              <Text style={[KType.meta, { color: colors.danger }]}>
                {pushMessage}
              </Text>
            ) : null}
            {pushOn ? (
              <Text style={KType.meta}>
                New-order alerts will arrive on this phone.
              </Text>
            ) : pushStatus === "denied" ? (
              <>
                <Button
                  label="Open system Settings"
                  onPress={() => void Linking.openSettings()}
                />
                <Text style={KType.meta}>
                  Allow notifications for Kitchen, then return here.
                </Text>
              </>
            ) : (
              <Button
                disabled={pushBusy}
                label={pushBusy ? "Working…" : "Enable push"}
                onPress={() => void enablePush()}
              />
            )}
          </View>
        </Card>

        <Text style={[KType.kicker, styles.sectionGap]}>Appearance</Text>
        <Card style={styles.card}>
          {appearanceOptions.map((option, index) => {
            const selected = appearance === option.id;
            return (
              <View key={option.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  onPress={() => setAppearance(option.id)}
                  style={styles.row}
                >
                  <Text style={KType.body}>{option.label}</Text>
                  <Text style={selected ? styles.check : styles.checkMuted}>
                    {selected ? "✓" : ""}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </Card>
      </StackScroll>
    </Screen>
  );
}
