import { Colors } from "@/constants/theme";
import { AuthProvider } from "@/lib/auth";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Menu" }} />
        <Stack.Screen name="item/[id]" options={{ title: "Item" }} />
        <Stack.Screen name="cart" options={{ title: "Cart" }} />
        <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
        <Stack.Screen name="orders/[id]" options={{ title: "Track order" }} />
        <Stack.Screen name="account" options={{ title: "Account" }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
      </Stack>
    </AuthProvider>
  );
}
