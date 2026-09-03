import { apiFetch } from "@/lib/api";
import { syncStaffPushIfGranted } from "@/lib/push";
import { clearTokens, loadTokens, saveTokens } from "@/lib/storage";
import type {
  StaffMePayload,
  StaffStoreProfile,
  StaffUser,
} from "@/lib/kitchen/staff-me";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type { StaffStoreProfile, StaffUser };

type AuthContextValue = {
  loading: boolean;
  user: StaffUser | null;
  store: StaffStoreProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUser(user: StaffUser): StaffUser {
  return {
    ...user,
    phoneE164: user.phoneE164 ?? null,
  };
}

function queuePushSync() {
  void syncStaffPushIfGranted().catch(() => {
    // Preferences surfaces push errors; silent here.
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StaffUser | null>(null);
  const [store, setStore] = useState<StaffStoreProfile | null>(null);

  const applyMe = useCallback((data: StaffMePayload) => {
    setUser(normalizeUser(data.user));
    setStore(data.store);
  }, []);

  const hydrate = useCallback(async () => {
    const { accessToken } = await loadTokens();
    if (!accessToken) {
      setUser(null);
      setStore(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<StaffMePayload>("/api/me");
      applyMe(data);
      queuePushSync();
    } catch {
      await clearTokens();
      setUser(null);
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, [applyMe]);

  const refreshMe = useCallback(async () => {
    const data = await apiFetch<StaffMePayload>("/api/me");
    applyMe(data);
  }, [applyMe]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: StaffUser;
        store: StaffStoreProfile | null;
      }>("/api/auth/mobile/login", {
        method: "POST",
        body: JSON.stringify({ email, password, app: "staff" }),
      });
      await saveTokens(data.accessToken, data.refreshToken);
      setUser(normalizeUser(data.user));
      // Login may return a slim store — refresh full profile from /api/me.
      setStore(data.store);
      try {
        const me = await apiFetch<StaffMePayload>("/api/me");
        applyMe(me);
      } catch {
        // keep login payload
      }
      queuePushSync();
    },
    [applyMe],
  );

  const signOut = useCallback(async () => {
    const { refreshToken } = await loadTokens();
    try {
      await apiFetch("/api/auth/mobile/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // still clear local session
    }
    await clearTokens();
    setUser(null);
    setStore(null);
  }, []);

  const value = useMemo(
    () => ({ loading, user, store, signIn, signOut, refreshMe }),
    [loading, user, store, signIn, signOut, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
