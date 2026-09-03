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
  registerStaffPushDevice,
  type PushPermissionStatus,
} from "@/lib/push";
import { Card, Screen } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
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
const KEY_PUSH = "kitchen.pref.push";

const APPEARANCE_OPTIONS: Array<{
  id: AppearancePref;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}> = [
  { id: "system", label: "System", icon: "phone-portrait-outline" },
  { id: "light", label: "Light", icon: "sunny-outline" },
  { id: "dark", label: "Dark", icon: "moon-outline" },
];

export default function AccountPreferencesScreen() {
  const { appearance, setAppearance, colors, resolved } = useKitchenTheme();
  const styles = useThemedStyles((c) => ({
    card: { paddingVertical: 4, gap: 0 },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 12,
      paddingHorizontal: 4,
      gap: 12,
    },
    rowLabel: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      flex: 1,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    sectionGap: { marginTop: 12 },
    check: { ...KType.bodyStrong, color: c.accent },
    checkMuted: { ...KType.body, color: c.textSecondary, minWidth: 16 },
  }));

  const [sound, setSound] = useState(true);
  const [haptic, setHaptic] = useState(true);
  const [pushWanted, setPushWanted] = useState(true);
  const [pushStatus, setPushStatus] =
    useState<PushPermissionStatus>("unknown");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushRegistered, setPushRegistered] = useState(false);

  const refreshPushStatus = useCallback(async () => {
    const status = await getStaffPushPermissionStatus();
    setPushStatus(status);
    return status;
  }, []);

  const syncPushIfAllowed = useCallback(async () => {
    const pref = await kvGet(KEY_PUSH);
    const wanted = pref !== "0";
    setPushWanted(wanted);
    if (!wanted) {
      setPushRegistered(false);
      await refreshPushStatus();
      return;
    }
    const status = await refreshPushStatus();
    if (status !== "granted") {
      setPushRegistered(false);
      return;
    }
    const result = await registerStaffPushDevice();
    setPushStatus(result.status);
    setPushRegistered(result.ok);
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

  const togglePush = useCallback(
    async (value: boolean) => {
      if (!value) {
        setPushWanted(false);
        setPushRegistered(false);
        void kvSet(KEY_PUSH, "0");
        return;
      }

      setPushWanted(true);
      void kvSet(KEY_PUSH, "1");
      setPushBusy(true);
      try {
        const result = await registerStaffPushDevice();
        setPushStatus(result.status);
        if (result.ok) {
          setPushRegistered(true);
          return;
        }
        setPushRegistered(false);
        if (result.reason === "denied") {
          Alert.alert(
            "Notifications blocked",
            "Allow notifications for Kitchen in Settings to get new-order alerts.",
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => void Linking.openSettings(),
              },
            ],
          );
        } else if (result.reason === "simulator") {
          Alert.alert("Push unavailable", result.message);
        }
      } finally {
        setPushBusy(false);
      }
    },
    [],
  );

  const pushOn = pushWanted && pushStatus === "granted" && pushRegistered;

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
          <View style={styles.row}>
            <Text style={KType.body}>Push</Text>
            <Switch
              value={pushOn}
              disabled={pushBusy}
              onValueChange={(value) => void togglePush(value)}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>
        </Card>

        <Text style={[KType.kicker, styles.sectionGap]}>Appearance</Text>
        <Card style={styles.card}>
          {APPEARANCE_OPTIONS.map((option, index) => {
            const selected = appearance === option.id;
            return (
              <View key={option.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  onPress={() => setAppearance(option.id)}
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.rowLabel}>
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={selected ? colors.accent : colors.textSecondary}
                    />
                    <Text style={KType.body}>{option.label}</Text>
                  </View>
                  <Text style={selected ? styles.check : styles.checkMuted}>
                    {selected ? "✓" : ""}
                  </Text>
                </Pressable>
              </View>
            );
          })}
          {appearance === "system" ? (
            <Text
              style={[KType.meta, { paddingHorizontal: 4, paddingBottom: 10 }]}
            >
              Following device · currently {resolved}
            </Text>
          ) : null}
        </Card>
      </StackScroll>
    </Screen>
  );
}
