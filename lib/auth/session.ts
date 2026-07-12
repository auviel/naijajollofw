import { auth } from "@/lib/auth/index";
import { storeRepository, mapStoreToProfile } from "@/lib/db/repositories/store.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { AppError } from "@/lib/utils/errors";
import type { StoreProfile } from "@/lib/domain/store/types";
import type { UserRole } from "@/lib/domain/auth/types";
import type { Session } from "next-auth";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  storeId: string;
  storeName: string;
  role: UserRole;
  phoneE164?: string | null;
  sessionVersion: number;
  emailVerifiedAt?: Date | null;
};

export type SessionContext = {
  user: SessionUser;
  store: StoreProfile;
};

function mapSessionUser(session: Session | null | undefined): SessionUser | null {
  if (!session?.user?.id || !session.user.email || !session.user.name) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    storeId: session.user.storeId,
    storeName: session.user.storeName,
    role: session.user.role,
    phoneE164: session.user.phoneE164 ?? null,
    sessionVersion: session.user.sessionVersion ?? 0,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = (await auth()) as Session | null;
  const mapped = mapSessionUser(session);
  if (!mapped) {
    return null;
  }

  const dbUser = await userRepository.findById(mapped.id);
  if (!dbUser) {
    return null;
  }
  if (dbUser.sessionVersion !== mapped.sessionVersion) {
    return null;
  }

  return {
    ...mapped,
    emailVerifiedAt: dbUser.emailVerifiedAt,
    phoneE164: dbUser.phoneE164 ?? mapped.phoneE164,
  };
}

/** Alias for clarity at call sites that treat auth as optional. */
export const getOptionalSessionUser = getSessionUser;

export async function requireStoreManager(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }
  if (user.role !== "STORE_MANAGER") {
    throw new AppError("FORBIDDEN", "Store manager access required", 403);
  }
  return user;
}

export async function requireDiner(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }
  if (user.role !== "DINER") {
    throw new AppError("FORBIDDEN", "Diner account required", 403);
  }
  return user;
}

/** Diner with a verified email — for password/phone and other sensitive actions. */
export async function requireVerifiedDiner(): Promise<SessionUser> {
  const user = await requireDiner();
  if (!user.emailVerifiedAt) {
    throw new AppError(
      "FORBIDDEN",
      "Verify your email before changing account security settings.",
      403,
    );
  }
  return user;
}

export async function requireSessionContext(): Promise<SessionContext> {
  const user = await requireStoreManager();
  const store = await storeRepository.getProfileById(user.storeId);

  if (!store) {
    throw new AppError("NOT_FOUND", "Store not found", 404);
  }

  return { user, store };
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "STORE_MANAGER") {
    return null;
  }

  const store = await storeRepository.getProfileById(user.storeId);
  if (!store) {
    return null;
  }

  return { user, store };
}

/** @deprecated Use mapStoreToProfile from store repository directly when needed. */
export { mapStoreToProfile };
