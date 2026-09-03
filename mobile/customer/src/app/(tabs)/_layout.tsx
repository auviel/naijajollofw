import { Colors, Radii, Shadows } from "@naijajollof/ui";
import { useCart } from "@/lib/cart";
import { DinerHeaderProfile } from "@/components/diner-header-profile";
import { Ionicons } from "@expo/vector-icons";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Tabs } from "expo-router";
import { DynamicColorIOS, Platform } from "react-native";

export default function TabsLayout() {
  const { cart } = useCart();
  const badge = cart.itemCount > 0 ? String(cart.itemCount) : undefined;

  if (Platform.OS === "ios") {
    return (
      <NativeTabs
        minimizeBehavior="onScrollDown"
        tintColor={Colors.accent}
        labelStyle={{
          color: DynamicColorIOS({ light: Colors.text, dark: "#fff" }),
        }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            sf={{ default: "fork.knife", selected: "fork.knife" }}
          />
          <NativeTabs.Trigger.Label>Menu</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="cart">
          <NativeTabs.Trigger.Icon
            sf={{ default: "bag", selected: "bag.fill" }}
          />
          <NativeTabs.Trigger.Label>Cart</NativeTabs.Trigger.Label>
          {badge ? (
            <NativeTabs.Trigger.Badge>{badge}</NativeTabs.Trigger.Badge>
          ) : null}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="orders">
          <NativeTabs.Trigger.Icon
            sf={{
              default: "list.clipboard",
              selected: "list.clipboard.fill",
            }}
          />
          <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="chat">
          <NativeTabs.Trigger.Icon
            sf={{
              default: "bubble.left.and.bubble.right",
              selected: "bubble.left.and.bubble.right.fill",
            }}
          />
          <NativeTabs.Trigger.Label>Ask Amaka</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: "800" },
        headerRight: () => <DinerHeaderProfile />,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontWeight: "700", fontSize: 12 },
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
          height: 72,
          borderRadius: Radii.lg,
          backgroundColor: Colors.surfaceElevated,
          borderTopWidth: 0,
          ...Shadows.float,
        },
        tabBarItemStyle: { paddingVertical: 8 },
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarBadge: badge,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bag" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Ask Amaka",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
