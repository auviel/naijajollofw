import type { UserRole } from "@/lib/domain/auth/types";
import { userRepository } from "@/lib/db/repositories/user.repository";
import bcrypt from "bcryptjs";

/** Precomputed bcrypt hash so missing-user paths still pay compare cost. */
const DUMMY_PASSWORD_HASH =
  "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW";

export type VerifiedUser = {
  id: string;
  email: string;
  name: string;
  storeId: string;
  storeName: string;
  role: UserRole;
  phoneE164: string | null;
  sessionVersion: number;
};

export async function verifyUserCredentials(
  email: string,
  password: string,
): Promise<VerifiedUser | null> {
  const user = await userRepository.findByEmail(email);
  const passwordValid = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    storeId: user.storeId,
    storeName: user.store?.name ?? "Store",
    role: user.role as UserRole,
    phoneE164: user.phoneE164 ?? null,
    sessionVersion: user.sessionVersion ?? 0,
  };
}
