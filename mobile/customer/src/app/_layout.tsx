import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { headerScreenOptions } from "@naijajollof/ui";
import { isRunningInExpoGo } from "expo";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Sentry from "@sentry/react-native";
import { useEffect } from "react";
import { Platform } from "react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  sendDefaultPii: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  enableNativeFramesTracking: !isRunningInExpoGo(),
  environment: __DEV__ ? "development" : "production",
});

function PushDeepLink() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    function openFromData(data: Record<string, unknown> | undefined) {
      const orderId = typeof data?.orderId === "string" ? data.orderId : null;
      const publicToken =
        typeof data?.publicToken === "string" ? data.publicToken : null;
      if (orderId && publicToken) {
        router.push(`/orders/${orderId}?token=${publicToken}`);
      }
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      openFromData(response?.notification.request.content.data as Record<string, unknown>);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromData(response.notification.request.content.data as Record<string, unknown>);
    });
    return () => sub.remove();
  }, [router]);

  return null;
}

function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <PushDeepLink />
        <Stack screenOptions={headerScreenOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="item/[id]" options={{ title: "Item" }} />
          <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
          <Stack.Screen name="orders/[id]" options={{ title: "Track order" }} />
          <Stack.Screen name="login" options={{ title: "Sign in" }} />
          <Stack.Screen name="register" options={{ title: "Create account" }} />
          <Stack.Screen name="forgot-password" options={{ title: "Reset password" }} />
          <Stack.Screen name="profile/addresses" options={{ title: "Addresses" }} />
          <Stack.Screen name="profile/security" options={{ title: "Security" }} />
          <Stack.Screen name="profile/cards" options={{ title: "Payment methods" }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
