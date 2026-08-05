import { apiFetch } from "@/lib/api";
import { registerDinerPushDevice } from "@/lib/push";
import { clearTokens, loadTokens, saveTokens } from "@/lib/storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type DinerUser = {
  id: string;
  email: string;
  name: string;
  phoneE164: string | null;
  storeId: string;
  storeName: string;
  emailVerified: boolean;
};

type AuthContextValue = {
  loading: boolean;
  user: DinerUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<DinerUser | null>(null);

  const hydrate = useCallback(async () => {
    const { accessToken } = await loadTokens();
    if (!accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiFetch<DinerUser>("/api/diner/me");
      setUser(me);
      void registerDinerPushDevice();
    } catch {
      await clearTokens();
      setUser(null);
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
      user: {
        id: string;
        email: string;
        name: string;
        phoneE164: string | null;
        storeId: string;
        storeName: string;
      };
    }>("/api/auth/mobile/login", {
      method: "POST",
      body: JSON.stringify({ email, password, app: "diner" }),
    });
    await saveTokens(data.accessToken, data.refreshToken);
    const me = await apiFetch<DinerUser>("/api/diner/me");
    setUser(me);
    void registerDinerPushDevice();
  }, []);

  const signOut = useCallback(async () => {
    const { refreshToken } = await loadTokens();
    try {
      await apiFetch("/api/auth/mobile/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore
    }
    await clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ loading, user, signIn, signOut }),
    [loading, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
