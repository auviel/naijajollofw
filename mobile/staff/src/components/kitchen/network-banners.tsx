import { Colors, Radii } from "@naijajollof/ui";
import { KType } from "@/lib/kitchen/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const up =
        state.isConnected === true && state.isInternetReachable !== false;
      setOffline(!up);
    });
    return unsub;
  }, []);

  if (!offline) return null;

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text style={styles.text}>You’re offline — bumps will retry when back</Text>
    </View>
  );
}

export function SessionTipBanner({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={styles.tip}>
      <Text style={styles.tipText}>
        You’ll stay signed in for 30 days on this device.
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8} accessibilityRole="button">
        <Text style={styles.dismiss}>Got it</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  text: {
    ...KType.metaStrong,
    color: Colors.inverse,
    textAlign: "center",
  },
  tip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  tipText: { ...KType.meta, flex: 1 },
  dismiss: { ...KType.metaStrong, color: Colors.accent },
});
