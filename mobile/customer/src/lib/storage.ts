import { kvDelete, kvGet, kvSet } from "@/lib/kv";

const ACCESS_KEY = "nj_diner_access";
const REFRESH_KEY = "nj_diner_refresh";
const CART_KEY = "nj_cart_sid";

export async function loadTokens() {
  const [accessToken, refreshToken] = await Promise.all([
    kvGet(ACCESS_KEY),
    kvGet(REFRESH_KEY),
  ]);
  return { accessToken, refreshToken };
}

export async function saveTokens(accessToken: string, refreshToken: string) {
  await Promise.all([kvSet(ACCESS_KEY, accessToken), kvSet(REFRESH_KEY, refreshToken)]);
}

export async function clearTokens() {
  await Promise.all([kvDelete(ACCESS_KEY), kvDelete(REFRESH_KEY)]);
}

export async function loadCartSid() {
  return kvGet(CART_KEY);
}

export async function saveCartSid(sessionId: string) {
  await kvSet(CART_KEY, sessionId);
}
