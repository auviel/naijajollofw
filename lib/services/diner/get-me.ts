import { requireDiner } from "@/lib/auth/session";
import { mapDinerMe, type DinerMe } from "@/lib/domain/auth/diner-me";

export type { DinerMe };

export async function getDinerMe(): Promise<DinerMe> {
  const user = await requireDiner();
  return mapDinerMe(user);
}
