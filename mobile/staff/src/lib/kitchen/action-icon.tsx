import type { TransitionAction } from "@naijajollof/api-types";
import { Colors } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";

type IonName = React.ComponentProps<typeof Ionicons>["name"];

/** Icon for kitchen transition / fulfill actions. */
export function actionIconName(
  to: TransitionAction["to"] | "fulfill_manual" | "back",
): IonName {
  switch (to) {
    case "preparing":
      return "play";
    case "ready":
    case "ready_for_pickup":
      return "checkmark-circle";
    case "completed":
      return "bag-check";
    case "cancelled":
      return "close-circle-outline";
    case "accepted":
      return "hand-left-outline";
    case "fulfill_manual":
      return "bicycle-outline";
    case "back":
      return "arrow-back";
    default:
      return "ellipse-outline";
  }
}

export function ActionIcon({
  to,
  variant = "primary",
  size = 18,
}: {
  to: TransitionAction["to"] | "fulfill_manual" | "back";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: number;
}) {
  const color =
    variant === "primary"
      ? Colors.inverse
      : variant === "danger"
        ? Colors.danger
        : Colors.secondary;

  return <Ionicons name={actionIconName(to)} size={size} color={color} />;
}
