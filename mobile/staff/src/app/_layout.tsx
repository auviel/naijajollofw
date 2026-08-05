import { AuthProvider, useAuth } from "@/lib/auth";
import { Colors, headerScreenOptions } from "@naijajollof/ui";
import { isRunningInExpoGo } from "expo";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Sentry from "@sentry/react-native";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  sendDefaultPii: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  enableNativeFramesTracking: !isRunningInExpoGo(),
  environment: __DEV__ ? "development" : "production",
});

function Gate({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onLogin = segments[0] === "login";
    if (!user && !onLogin) {
      router.replace("/login");
    } else if (user && onLogin) {
      router.replace("/");
    }
  }, [loading, user, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return children;
}

function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Gate>
        <Stack screenOptions={headerScreenOptions}>
          <Stack.Screen name="index" options={{ title: "Kitchen" }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="orders/[id]" options={{ title: "Ticket" }} />
          <Stack.Screen name="account" options={{ title: "Account" }} />
        </Stack>
      </Gate>
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
