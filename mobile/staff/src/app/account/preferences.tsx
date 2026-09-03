import { StackScroll } from "@/components/kitchen/stack-scroll";
import { KType } from "@/lib/kitchen/typography";
import {
  type AppearancePref,
  useKitchenTheme,
} from "@/lib/kitchen/theme";
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

export default function AccountPreferencesScreen() {
  const { appearance, setAppearance } = useKitchenTheme();
  const [sound, setSound] = useState(true);
  const [haptic, setHaptic] = useState(true);
  const [pushStatus, setPushStatus] = useState<string>("unknown");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [s, h] = await Promise.all([kvGet(KEY_SOUND), kvGet(KEY_HAPTIC)]);
      if (s != null) setSound(s === "1");
      if (h != null) setHaptic(h === "1");
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

  const appearanceOptions: Array<{ id: AppearancePref; label: string }> = [
    { id: "system", label: "System" },
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ];

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
          <Text
            style={[KType.meta, { paddingHorizontal: 4, paddingBottom: 10 }]}
          >
            Dark updates chrome (nav, canvas). Full card theming follows.
          </Text>
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
