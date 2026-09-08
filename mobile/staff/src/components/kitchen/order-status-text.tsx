import { orderStatusColor, orderStatusLabel } from "@/lib/kitchen/order-status";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { Text, type TextProps, type TextStyle } from "react-native";

export function OrderStatusText({
  status,
  style,
  ...rest
}: {
  status: string | null | undefined;
  style?: TextStyle;
} & Omit<TextProps, "style" | "children">) {
  const { colors } = useKitchenTheme();
  return (
    <Text
      {...rest}
      style={[
        KType.metaStrong,
        { color: orderStatusColor(status, colors) },
        style,
      ]}
    >
      {orderStatusLabel(status)}
    </Text>
  );
}
