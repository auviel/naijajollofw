import { Colors, Radii, Shadows } from "@naijajollof/ui";
import { KType } from "@/lib/kitchen/typography";
import { Ionicons } from "@expo/vector-icons";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Tabs } from "expo-router";
import { DynamicColorIOS, Platform } from "react-native";

export default function TabsLayout() {
  if (Platform.OS === "ios") {
    return (
      <NativeTabs
        minimizeBehavior="onScrollDown"
        tintColor={Colors.accent}
        labelStyle={{
          ...KType.tab,
          color: DynamicColorIOS({ light: Colors.text, dark: "#fff" }),
        }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            sf={{
              default: "square.grid.2x2",
              selected: "square.grid.2x2.fill",
            }}
          />
          <NativeTabs.Trigger.Label>Board</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="menu">
          <NativeTabs.Trigger.Icon
            sf={{
              default: "list.bullet.rectangle",
              selected: "list.bullet.rectangle.fill",
            }}
          />
          <NativeTabs.Trigger.Label>Menu</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="account">
          <NativeTabs.Trigger.Icon
            sf={{
              default: "person.crop.circle",
              selected: "person.crop.circle.fill",
            }}
          />
          <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { ...KType.tab },
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
          height: 68,
          borderRadius: Radii.lg,
          backgroundColor: Colors.surface,
          borderTopWidth: 0,
          ...Shadows.float,
        },
        tabBarItemStyle: { paddingVertical: 6 },
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Board",
          tabBarLabel: "Board",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarLabel: "Menu",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarLabel: "Account",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
