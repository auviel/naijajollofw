import {
  getBoardUnseenCount,
  subscribeBoardAttention,
} from "@/lib/kitchen/board-attention";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

function useBoardBadge() {
  const [count, setCount] = useState(getBoardUnseenCount());
  useEffect(
    () => subscribeBoardAttention(() => setCount(getBoardUnseenCount())),
    [],
  );
  return count;
}

export default function TabsLayout() {
  const badge = useBoardBadge();
  const { colors, resolved } = useKitchenTheme();
  const isAndroid = Platform.OS === "android";
  const blurEffect =
    resolved === "dark"
      ? "systemChromeMaterialDark"
      : "systemChromeMaterialLight";
  const androidIndicator =
    resolved === "dark" ? colors.accentSoft : "rgba(255, 143, 74, 0.18)";

  return (
    <NativeTabs
      key={`tabs-${resolved}`}
      minimizeBehavior="onScrollDown"
      tintColor={colors.accent}
      iconColor={{
        default: colors.textSecondary,
        selected: colors.accent,
      }}
      backgroundColor={colors.surface}
      blurEffect={blurEffect}
      // Android: Material 3 full-width bar with labels. iOS: icon-only.
      labelVisibilityMode={isAndroid ? "labeled" : "unlabeled"}
      badgeBackgroundColor={colors.accent}
      indicatorColor={androidIndicator}
      rippleColor={androidIndicator}
      tabBarRespectsIMEInsets={isAndroid}
    >
      <NativeTabs.Trigger name="index" accessibilityLabel="Board">
        <NativeTabs.Trigger.Label hidden={!isAndroid}>
          Board
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: "square.grid.2x2",
            selected: "square.grid.2x2.fill",
          }}
          md="grid_view"
        />
        {badge > 0 ? (
          <NativeTabs.Trigger.Badge>{String(badge)}</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="menu" accessibilityLabel="Menu">
        <NativeTabs.Trigger.Label hidden={!isAndroid}>
          Menu
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: "list.bullet.rectangle",
            selected: "list.bullet.rectangle.fill",
          }}
          md="restaurant_menu"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="customers" accessibilityLabel="Customers">
        <NativeTabs.Trigger.Label hidden={!isAndroid}>
          Customers
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: "person.2",
            selected: "person.2.fill",
          }}
          md="group"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account" accessibilityLabel="Account">
        <NativeTabs.Trigger.Label hidden={!isAndroid}>
          Account
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: "person.crop.circle",
            selected: "person.crop.circle.fill",
          }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
