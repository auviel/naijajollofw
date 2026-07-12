import type { UserRole } from "@/lib/domain/auth/types";
import type { NextAuthConfig } from "next-auth";

/** Edge-compatible Auth.js config — safe to import from middleware. */
export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.storeId = user.storeId;
        token.storeName = user.storeName;
        token.role = user.role;
        token.phoneE164 = user.phoneE164 ?? null;
      }

      if (trigger === "update" && session?.storeName) {
        token.storeName = session.storeName;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.storeId = token.storeId as string;
        session.user.storeName = token.storeName as string;
        session.user.role = token.role as UserRole;
        session.user.phoneE164 = (token.phoneE164 as string | null | undefined) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
