import { CART_SESSION_HEADER } from "@naijajollof/api-types";
import { API_URL } from "@/lib/config";
import {
  clearTokens,
  loadCartSid,
  loadTokens,
  saveTokens,
} from "@/lib/storage";
import { DefaultChatTransport } from "ai";

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = await loadTokens();
  if (!refreshToken) return null;
  const response = await fetch(`${API_URL}/api/auth/mobile/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    await clearTokens();
    return null;
  }
  const json = (await response.json()) as {
    data: { accessToken: string; refreshToken: string };
  };
  await saveTokens(json.data.accessToken, json.data.refreshToken);
  return json.data.accessToken;
}

/**
 * Authenticated fetch for AI chat streams.
 * Attaches Bearer + x-cart-sid; refreshes once on 401.
 * Does not parse response.json() — streams must stay intact.
 */
async function dinerChatFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  retry = true,
): Promise<Response> {
  const [{ accessToken }, cartSid] = await Promise.all([
    loadTokens(),
    loadCartSid(),
  ]);
  const headers = new Headers(init?.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (cartSid) {
    headers.set(CART_SESSION_HEADER, cartSid);
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && retry && accessToken) {
    const next = await refreshAccessToken();
    if (next) return dinerChatFetch(input, init, false);
  }
  return response;
}

export function createDinerChatTransport() {
  return new DefaultChatTransport({
    api: `${API_URL}/api/ai/chat`,
    fetch: dinerChatFetch,
  });
}
