import { API_URL } from "@/lib/config";
import { clearTokens, loadTokens, saveTokens } from "@/lib/storage";

type ApiError = {
  error?: string;
  code?: string;
};

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = await loadTokens();
  if (!refreshToken) {
    return null;
  }

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

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const { accessToken } = await loadTokens();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (response.status === 401 && retry) {
    const next = await refreshAccessToken();
    if (next) {
      return apiFetch<T>(path, init, false);
    }
  }

  const json = (await response.json().catch(() => ({}))) as ApiError & {
    data?: T;
  };

  if (!response.ok) {
    throw new Error(json.error || `Request failed (${response.status})`);
  }

  return json.data as T;
}
