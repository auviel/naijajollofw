import { Platform } from "react-native";

async function nativeStore() {
  return import("expo-secure-store");
}

export async function kvGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  const SecureStore = await nativeStore();
  return SecureStore.getItemAsync(key);
}

export async function kvSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  const SecureStore = await nativeStore();
  await SecureStore.setItemAsync(key, value);
}

export async function kvDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  const SecureStore = await nativeStore();
  await SecureStore.deleteItemAsync(key);
}
