import type { UserRole } from "@/lib/domain/auth/types";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      storeId: string;
      storeName: string;
      role: UserRole;
      phoneE164?: string | null;
      sessionVersion?: number;
    } & DefaultSession["user"];
  }

  interface User {
    storeId: string;
    storeName: string;
    role: UserRole;
    phoneE164?: string | null;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    storeId?: string;
    storeName?: string;
    role?: UserRole;
    phoneE164?: string | null;
    sessionVersion?: number;
  }
}

export {};
