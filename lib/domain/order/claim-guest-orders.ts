import type { Prisma } from "@prisma/client";

/**
 * Guest storefront orders have `userId: null` and are tied by phone Customer
 * and/or receipt email. Build the filter used to claim them onto a diner User.
 */
export function buildClaimGuestOrdersWhere(input: {
  storeId: string;
  customerId?: string | null;
  email?: string | null;
}): Prisma.OrderWhereInput | null {
  const email = input.email?.trim().toLowerCase() || null;
  const or: Prisma.OrderWhereInput[] = [];

  if (input.customerId) {
    or.push({ customerId: input.customerId });
  }
  if (email) {
    or.push({ customerEmail: email });
  }
  if (or.length === 0) {
    return null;
  }

  return {
    storeId: input.storeId,
    userId: null,
    NOT: { status: "pending_payment" },
    OR: or,
  };
}
