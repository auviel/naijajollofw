import { AuthProvider, useAuth } from "@/lib/auth";
import { Colors, headerScreenOptions } from "@naijajollof/ui";
import { isRunningInExpoGo } from "expo";
import {
  DefaultTheme,
  ThemeProvider,
  Stack,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Sentry from "@sentry/react-native";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  sendDefaultPii: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  enableNativeFramesTracking: !isRunningInExpoGo(),
  environment: __DEV__ ? "development" : "production",
});

const kitchenTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.accent,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.accent,
  },
};

function Gate({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onAuthScreen =
      segments[0] === "login" || segments[0] === "forgot-password";
    if (!user && !onAuthScreen) {
      router.replace("/login");
    } else if (user && onAuthScreen) {
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={kitchenTheme}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Gate>
            <Stack screenOptions={headerScreenOptions}>
              <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false, title: "Board" }}
              />
              <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen
              name="forgot-password"
              options={{ headerShown: false }}
            />
              <Stack.Screen
                name="orders/index"
                options={{
                  title: "Orders",
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
              <Stack.Screen
                name="orders/[id]"
                options={{
                  title: "Order",
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
              <Stack.Screen
                name="inbox"
                options={{
                  title: "Inbox",
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
              <Stack.Screen
                name="account/you"
                options={{
                  title: "You",
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
              <Stack.Screen
                name="account/change-password"
                options={{
                  title: "Change password",
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
              <Stack.Screen
                name="account/store"
                options={{
                  title: "Store",
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
              <Stack.Screen
                name="account/preferences"
                options={{
                  title: "Preferences",
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
              <Stack.Screen
                name="customers/new"
                options={{
                  title: "New customer",
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
              <Stack.Screen
                name="customers/[id]"
                options={{
                  title: "Customer",
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
              <Stack.Screen
                name="menu/new"
                options={{
                  title: "New item",
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
              <Stack.Screen
                name="menu/[id]"
                options={{
                  title: "Edit item",
                  headerBackButtonDisplayMode: "minimal",
                }}
              />
            </Stack>
          </Gate>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
