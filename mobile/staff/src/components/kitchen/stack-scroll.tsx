import { Colors, Space } from "@naijajollof/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/**
 * Scroll body for stack screens (ticket, orders, etc.).
 * Uses safe-area bottom inset so actions clear the home indicator on every iPhone.
 * Pair with opaque stack headers (see headerScreenOptions) so content never
 * slides under the nav bar across Dynamic Island / notch / Android sizes.
 */
export function StackScroll({
  children,
  contentContainerStyle,
  style,
  ...rest
}: ScrollViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={style}
      contentContainerStyle={[
        styles.pad,
        { paddingBottom: Math.max(insets.bottom, Space.md) + Space.xl },
        contentContainerStyle,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 8, android: 12, default: 12 }),
    gap: 10,
  },
});

export const stackScreenBackground: StyleProp<ViewStyle> = {
  flex: 1,
  backgroundColor: Colors.background,
};
