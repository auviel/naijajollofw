import { Radii, Shadows } from "@naijajollof/ui";
import {
  getBoardUnseenCount,
  subscribeBoardAttention,
} from "@/lib/kitchen/board-attention";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { Ionicons } from "@expo/vector-icons";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";

function useBoardBadge() {
  const [count, setCount] = useState(getBoardUnseenCount());
  useEffect(
    () => subscribeBoardAttention(() => setCount(getBoardUnseenCount())),
    [],
  );
  return count;
}

function BoardTabIcon({
  color,
  size,
  focused,
}: {
  color: string;
  size: number;
  focused?: boolean;
}) {
  const badge = useBoardBadge();
  const { colors } = useKitchenTheme();
  return (
    <View>
      <Ionicons
        name={focused ? "grid" : "grid-outline"}
        color={color}
        size={size}
      />
      {badge > 0 ? (
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -6,
            minWidth: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.accent,
          }}
        />
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const badge = useBoardBadge();
  const { colors, resolved } = useKitchenTheme();
  const blurEffect =
    resolved === "dark"
      ? "systemChromeMaterialDark"
      : "systemChromeMaterialLight";

  if (Platform.OS === "ios") {
    return (
      <NativeTabs
        key={resolved}
        minimizeBehavior="onScrollDown"
        tintColor={colors.accent}
        iconColor={{
          default: colors.textSecondary,
          selected: colors.accent,
        }}
        blurEffect={blurEffect}
        labelVisibilityMode="unlabeled"
        badgeBackgroundColor={colors.accent}
      >
        <NativeTabs.Trigger name="index" accessibilityLabel="Board">
          <NativeTabs.Trigger.Label hidden>Board</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{
              default: "square.grid.2x2",
              selected: "square.grid.2x2.fill",
            }}
          />
          {badge > 0 ? (
            <NativeTabs.Trigger.Badge>{String(badge)}</NativeTabs.Trigger.Badge>
          ) : null}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="menu" accessibilityLabel="Menu">
          <NativeTabs.Trigger.Label hidden>Menu</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{
              default: "list.bullet.rectangle",
              selected: "list.bullet.rectangle.fill",
            }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="customers" accessibilityLabel="Customers">
          <NativeTabs.Trigger.Label hidden>Customers</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{
              default: "person.2",
              selected: "person.2.fill",
            }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="account" accessibilityLabel="Account">
          <NativeTabs.Trigger.Label hidden>Account</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{
              default: "person.crop.circle",
              selected: "person.crop.circle.fill",
            }}
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      key={resolved}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
          height: 60,
          borderRadius: Radii.lg,
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          ...Shadows.float,
        },
        tabBarItemStyle: { paddingVertical: 8 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Board",
          tabBarBadge: badge > 0 ? badge : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <BoardTabIcon
              color={String(color)}
              size={size}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Customers",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
