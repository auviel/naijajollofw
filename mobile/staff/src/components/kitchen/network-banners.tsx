import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const styles = useThemedStyles((c) => ({
    wrap: {
      backgroundColor: c.secondary,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    text: {
      ...KType.metaStrong,
      color: c.inverse,
      textAlign: "center" as const,
    },
  }));

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
