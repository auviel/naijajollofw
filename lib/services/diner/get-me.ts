import { requireDiner, type SessionUser } from "@/lib/auth/session";

export type DinerMe = {
  id: string;
  email: string;
  name: string;
  phoneE164: string | null;
  storeId: string;
  storeName: string;
  emailVerified: boolean;
};

export function mapDinerMe(user: SessionUser): DinerMe {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phoneE164: user.phoneE164 ?? null,
    storeId: user.storeId,
    storeName: user.storeName,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

export async function getDinerMe(): Promise<DinerMe> {
  const user = await requireDiner();
  return mapDinerMe(user);
}
