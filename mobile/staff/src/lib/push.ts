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

export type PushPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "unknown";

export type PushRegisterResult =
  | { ok: true; status: "granted" }
  | {
      ok: false;
      status: PushPermissionStatus;
      reason:
        | "web"
        | "simulator"
        | "denied"
        | "undetermined"
        | "missing_project"
        | "token_failed"
        | "api_failed";
      message: string;
    };

export function humanizePushStatus(status: string): string {
  switch (status) {
    case "granted":
      return "On";
    case "denied":
      return "Blocked in Settings";
    case "undetermined":
      return "Not enabled yet";
    default:
      return "Unknown";
  }
}

export async function getStaffPushPermissionStatus(): Promise<PushPermissionStatus> {
  if (Platform.OS === "web") return "unknown";
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status === "granted") return "granted";
    if (perm.status === "denied") return "denied";
    if (perm.status === "undetermined") return "undetermined";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function resolveEasProjectId(): string | undefined {
  const rawProjectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (
    typeof rawProjectId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rawProjectId,
    )
  ) {
    return rawProjectId;
  }
  return undefined;
}

/**
 * Request permission (if needed), create the Expo push token, and register
 * the device with the API. Returns a typed result so Preferences can explain failures.
 */
export async function registerStaffPushDevice(): Promise<PushRegisterResult> {
  if (Platform.OS === "web") {
    return {
      ok: false,
      status: "unknown",
      reason: "web",
      message: "Push is only available in the iOS and Android kitchen apps.",
    };
  }

  if (!Device.isDevice) {
    return {
      ok: false,
      status: "undetermined",
      reason: "simulator",
      message:
        "Push needs a physical device. Simulators and emulators cannot receive Expo push tokens.",
    };
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }

  if (status === "denied") {
    return {
      ok: false,
      status: "denied",
      reason: "denied",
      message:
        "Notifications are blocked for Kitchen. Open Settings to allow alerts for new orders.",
    };
  }

  if (status !== "granted") {
    return {
      ok: false,
      status: "undetermined",
      reason: "undetermined",
      message: "Permission was not granted. Try Enable push again.",
    };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("new-orders", {
      name: "New orders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  const projectId = resolveEasProjectId();
  if (!projectId) {
    return {
      ok: false,
      status: "granted",
      reason: "missing_project",
      message:
        "This build is missing an EAS project id, so a push token cannot be created.",
    };
  }

  let token: Notifications.ExpoPushToken;
  try {
    token = await Notifications.getExpoPushTokenAsync({ projectId });
  } catch {
    return {
      ok: false,
      status: "granted",
      reason: "token_failed",
      message: "Could not create a push token. Try again in a moment.",
    };
  }

  try {
    await apiFetch("/api/mobile/devices", {
      method: "POST",
      body: JSON.stringify({
        expoPushToken: token.data,
        platform:
          Platform.OS === "ios"
            ? "ios"
            : Platform.OS === "android"
              ? "android"
              : "web",
        app: "staff",
      }),
    });
  } catch {
    return {
      ok: false,
      status: "granted",
      reason: "api_failed",
      message: "Permission is on, but the device could not be registered. Try again.",
    };
  }

  return { ok: true, status: "granted" };
}

/** If OS permission is already granted, refresh the device token quietly. */
export async function syncStaffPushIfGranted(): Promise<void> {
  const status = await getStaffPushPermissionStatus();
  if (status !== "granted") return;
  await registerStaffPushDevice();
}
