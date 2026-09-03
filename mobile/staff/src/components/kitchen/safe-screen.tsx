import { Screen } from "@naijajollof/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { StyleProp, ViewStyle } from "react-native";

/** Screen that clears the notch / Dynamic Island when stack headers are hidden. */
export function SafeScreen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return <Screen style={[{ paddingTop: insets.top }, style]}>{children}</Screen>;
}
