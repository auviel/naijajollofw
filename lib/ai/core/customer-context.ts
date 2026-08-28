import type { SessionUser } from "@/lib/auth/session";

export function buildAiCustomerContextBlock(user: SessionUser | null): string {
  if (!user) {
    return `Customer context: Guest (not signed in).
- Do not assume they have an account.
- For checkout, saved cards, saved addresses, or order history, invite them to sign in at /signin when needed.
- They can still browse the menu and add items to cart.`;
  }

  if (user.role !== "DINER") {
    return `Customer context: Signed-in staff (${user.name}).
- Help as a diner-facing host. For dashboard tasks, use the store dashboard — not chat checkout.`;
  }

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  return `Customer context: Signed-in customer (${firstName}).
- Never ask them to sign in or create an account.
- For checkout: direct them to /checkout (or review cart first if empty).
- Order history: /account/orders. Payment methods: /account/payment. Addresses: /account/addresses.
- You cannot charge cards or place the order inside chat — guide them to checkout.`;
}
