import type { PublicOrderView } from "@naijajollof/api-types";
import { kvGet, kvSet } from "@/lib/kv";

const RECENT_KEY = "nj_diner_recent_orders";

export type RecentOrder = {
  id: string;
  publicToken: string;
  displayNumber: string | null;
  statusMessage: string;
  totalCents: number;
  fulfillmentType: "pickup" | "delivery";
  placedAt: string | null;
};

function toRecent(order: PublicOrderView): RecentOrder {
  return {
    id: order.id,
    publicToken: order.publicToken,
    displayNumber: order.displayNumber,
    statusMessage: order.statusMessage,
    totalCents: order.totalCents,
    fulfillmentType: order.fulfillmentType,
    placedAt: order.placedAt,
  };
}

export async function loadRecentOrders(): Promise<RecentOrder[]> {
  const raw = await kvGet(RECENT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RecentOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function rememberOrder(order: PublicOrderView): Promise<void> {
  const next = [
    toRecent(order),
    ...(await loadRecentOrders()).filter((item) => item.id !== order.id),
  ].slice(0, 20);
  await kvSet(RECENT_KEY, JSON.stringify(next));
}
