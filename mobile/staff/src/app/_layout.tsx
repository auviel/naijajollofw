import { AuthProvider, useAuth } from "@/lib/auth";
import { Colors } from "@/constants/theme";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

function Gate({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }
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

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Gate>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.surface },
            headerTintColor: Colors.text,
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ title: "Kitchen" }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="orders/[id]" options={{ title: "Ticket" }} />
          <Stack.Screen name="account" options={{ title: "Account" }} />
        </Stack>
      </Gate>
    </AuthProvider>
  );
}
