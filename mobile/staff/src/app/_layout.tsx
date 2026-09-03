import { AuthProvider, useAuth } from "@/lib/auth";
import {
  KitchenThemeProvider,
  useKitchenTheme,
} from "@/lib/kitchen/theme";
import { headerScreenOptions } from "@naijajollof/ui";
import { isRunningInExpoGo } from "expo";
import { Stack, useRouter, useSegments } from "expo-router";
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

function Gate({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const { colors } = useKitchenTheme();
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
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return children;
}

function ThemedRoot() {
  const { colors, resolved } = useKitchenTheme();

  return (
    <AuthProvider>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      <Gate>
        <Stack
          screenOptions={{
            ...headerScreenOptions,
            headerTintColor: colors.text,
            headerTitleStyle: {
              ...headerScreenOptions.headerTitleStyle,
              color: colors.text,
            },
            headerStyle: {
              backgroundColor: colors.surface,
            },
            contentStyle: {
              backgroundColor: colors.background,
            },
          }}
        >
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
  );
}

function RootShell() {
  const { colors } = useKitchenTheme();
  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ThemedRoot />
    </GestureHandlerRootView>
  );
}

function RootLayout() {
  return (
    <KitchenThemeProvider>
      <RootShell />
    </KitchenThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);
