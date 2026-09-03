import { Linking, Platform } from "react-native";

export async function openTel(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return;
  const url = `tel:${digits}`;
  await Linking.openURL(url);
}

export async function openMapsAddress(address: string) {
  const q = encodeURIComponent(address.trim());
  if (!q) return;
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?q=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
  await Linking.openURL(url);
}

export function emailLooksValid(email: string): boolean {
  const trimmed = email.trim();
  // Require local@domain.tld shape — cuts fat-finger submits.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
