import { apiFetch } from "@/lib/api";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerStaffPushDevice(): Promise<void> {
  if (Platform.OS === "web" || !Device.isDevice) {
    return;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== "granted") {
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("new-orders", {
      name: "New orders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  const rawProjectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const projectId =
    typeof rawProjectId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rawProjectId,
    )
      ? rawProjectId
      : undefined;
  if (!projectId) {
    return;
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });

  await apiFetch("/api/mobile/devices", {
    method: "POST",
    body: JSON.stringify({
      expoPushToken: token.data,
      platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
      app: "staff",
    }),
  });
}
