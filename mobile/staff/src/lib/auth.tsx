import { apiFetch } from "@/lib/api";
import { clearTokens, loadTokens, saveTokens } from "@/lib/storage";
import { registerStaffPushDevice } from "@/lib/push";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  storeId: string;
  storeName: string;
};

export type StaffStore = {
  id: string;
  name: string;
  phone: string;
};

type AuthContextValue = {
  loading: boolean;
  user: StaffUser | null;
  store: StaffStore | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StaffUser | null>(null);
  const [store, setStore] = useState<StaffStore | null>(null);

  const hydrate = useCallback(async () => {
    const { accessToken } = await loadTokens();
    if (!accessToken) {
      setUser(null);
      setStore(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ user: StaffUser; store: StaffStore }>(
        "/api/me",
      );
      setUser(data.user);
      setStore(data.store);
      void registerStaffPushDevice();
    } catch {
      await clearTokens();
      setUser(null);
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{
      accessToken: string;
      refreshToken: string;
      user: StaffUser;
      store: StaffStore | null;
    }>("/api/auth/mobile/login", {
      method: "POST",
      body: JSON.stringify({ email, password, app: "staff" }),
    });
    await saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    setStore(data.store);
    void registerStaffPushDevice();
  }, []);

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
    () => ({ loading, user, store, signIn, signOut }),
    [loading, user, store, signIn, signOut],
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
