export type DinerMe = {
  id: string;
  email: string;
  name: string;
  phoneE164: string | null;
  storeId: string;
  storeName: string;
  emailVerified: boolean;
};

export function mapDinerMe(user: {
  id: string;
  email: string;
  name: string;
  phoneE164?: string | null;
  storeId: string;
  storeName: string;
  emailVerifiedAt?: Date | null;
}): DinerMe {
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
