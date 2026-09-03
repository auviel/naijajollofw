import { StackScroll } from "@/components/kitchen/stack-scroll";
import { KType } from "@/lib/kitchen/typography";
import { kvGet, kvSet } from "@/lib/kv";
import { registerStaffPushDevice } from "@/lib/push";
import { Button, Card, Colors, Screen } from "@naijajollof/ui";
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";

const KEY_SOUND = "kitchen.pref.sound";
const KEY_HAPTIC = "kitchen.pref.haptic";
const KEY_APPEARANCE = "kitchen.pref.appearance";

export default function AccountPreferencesScreen() {
  const [sound, setSound] = useState(true);
  const [haptic, setHaptic] = useState(true);
  const [appearance, setAppearance] = useState<"system" | "light">("system");
  const [pushStatus, setPushStatus] = useState<string>("unknown");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [s, h, a] = await Promise.all([
        kvGet(KEY_SOUND),
        kvGet(KEY_HAPTIC),
        kvGet(KEY_APPEARANCE),
      ]);
      if (s != null) setSound(s === "1");
      if (h != null) setHaptic(h === "1");
      if (a === "light" || a === "system") setAppearance(a);
      const perm = await Notifications.getPermissionsAsync();
      setPushStatus(perm.status);
    })();
  }, []);

  const toggleSound = useCallback((value: boolean) => {
    setSound(value);
    void kvSet(KEY_SOUND, value ? "1" : "0");
  }, []);

  const toggleHaptic = useCallback((value: boolean) => {
    setHaptic(value);
    void kvSet(KEY_HAPTIC, value ? "1" : "0");
  }, []);

  const setAppearancePref = useCallback((value: "system" | "light") => {
    setAppearance(value);
    void kvSet(KEY_APPEARANCE, value);
  }, []);

  async function enablePush() {
    setPushBusy(true);
    try {
      await registerStaffPushDevice();
      const perm = await Notifications.getPermissionsAsync();
      setPushStatus(perm.status);
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <Screen>
      <StackScroll>
        <Text style={KType.kicker}>Notifications</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={KType.body}>Sound</Text>
            <Switch value={sound} onValueChange={toggleSound} />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={KType.body}>Haptic</Text>
            <Switch value={haptic} onValueChange={toggleHaptic} />
          </View>
          <View style={styles.divider} />
          <View style={styles.pushBlock}>
            <Text style={KType.body}>Push</Text>
            <Text style={KType.meta}>Status · {pushStatus}</Text>
            {pushStatus !== "granted" ? (
              <>
                <Button
                  disabled={pushBusy}
                  label={pushBusy ? "Working…" : "Enable push"}
                  onPress={() => void enablePush()}
                />
                {pushStatus === "denied" ? (
                  <Button
                    variant="ghost"
                    label="Open system Settings"
                    onPress={() => void Linking.openSettings()}
                  />
                ) : null}
              </>
            ) : (
              <Text style={KType.meta}>Push enabled for this device.</Text>
            )}
            <Text style={[KType.meta, { marginTop: 4 }]}>
              Quiet hours — coming later
            </Text>
          </View>
        </Card>

        <Text style={[KType.kicker, styles.sectionGap]}>Appearance</Text>
        <Card style={styles.card}>
          {(["system", "light"] as const).map((option) => {
            const selected = appearance === option;
            return (
              <Pressable
                key={option}
                onPress={() => setAppearancePref(option)}
                style={styles.row}
              >
                <Text style={KType.body}>
                  {option === "system" ? "System" : "Light"}
                </Text>
                <Text style={selected ? styles.check : styles.checkMuted}>
                  {selected ? "✓" : ""}
                </Text>
              </Pressable>
            );
          })}
        </Card>
      </StackScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 4, gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  pushBlock: { gap: 8, paddingVertical: 12, paddingHorizontal: 4 },
  sectionGap: { marginTop: 12 },
  check: { ...KType.bodyStrong, color: Colors.accent },
  checkMuted: { ...KType.body, color: Colors.textSecondary, minWidth: 16 },
});
