import { API_URL } from "@/lib/config";
import { clearTokens, loadTokens, saveTokens } from "@/lib/storage";
import * as Sentry from "@sentry/react-native";

type ApiError = {
  error?: string;
  code?: string;
};

function reportApiFailure(input: {
  path: string;
  method: string;
  status?: number;
  code?: string;
  message: string;
  cause?: unknown;
}) {
  // Skip expected auth-expiry noise (refresh path handles 401).
  if (input.status === 401) return;
  // Dev Fast Refresh / compile races often surface as empty 5xx bodies — don't pollute Sentry.
  if (__DEV__) return;

  const error =
    input.cause instanceof Error ? input.cause : new Error(input.message);

  Sentry.captureException(error, {
    tags: {
      api_path: input.path.split("?")[0] ?? input.path,
      api_method: input.method,
      ...(input.status !== undefined
        ? { api_status: String(input.status) }
        : {}),
      ...(input.code ? { api_code: input.code } : {}),
    },
    fingerprint: [
      "apiFetch",
      input.method,
      input.path.split("?")[0] ?? input.path,
      String(input.status ?? "network"),
    ],
  });
}

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

function isFormDataBody(body: BodyInit | null | undefined): boolean {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();

  let response: Response;
  try {
    const { accessToken } = await loadTokens();
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (
      init.body &&
      !headers.has("Content-Type") &&
      !isFormDataBody(init.body)
    ) {
      headers.set("Content-Type", "application/json");
    }
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (cause) {
    reportApiFailure({
      path,
      method,
      message: cause instanceof Error ? cause.message : "Network error",
      cause,
    });
    throw cause;
  }

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
    const message = json.error || `Request failed (${response.status})`;
    reportApiFailure({
      path,
      method,
      status: response.status,
      code: json.code,
      message,
    });
    throw new Error(message);
  }

  return json.data as T;
}

/** Multipart upload helper — field name defaults to `file` (menu image API). */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  method: "POST" | "PUT" | "PATCH" = "POST",
): Promise<T> {
  return apiFetch<T>(path, { method, body: formData });
}
