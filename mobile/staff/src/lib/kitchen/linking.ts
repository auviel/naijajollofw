import { Alert, Linking, Platform } from "react-native";

export async function openTel(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return;
  const url = `tel:${digits}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Calling unavailable", "This device can’t place phone calls.");
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert("Calling unavailable", "This device can’t place phone calls.");
  }
}

export async function openMapsAddress(address: string) {
  const q = encodeURIComponent(address.trim());
  if (!q) return;
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?q=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Could not open Maps");
  }
}

export function emailLooksValid(email: string): boolean {
  const trimmed = email.trim();
  // Require local@domain.tld shape — cuts fat-finger submits.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
