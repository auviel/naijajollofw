import { useCallback, useEffect, useState } from "react";
import { kvGet, kvSet } from "@/lib/kv";

const KEY = "kitchen.inbox.unread";

export async function getInboxUnreadCount(): Promise<number> {
  const raw = await kvGet(KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export async function setInboxUnreadCount(n: number): Promise<void> {
  await kvSet(KEY, String(Math.max(0, Math.floor(n))));
}

export function useInboxUnread() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    void getInboxUnreadCount().then(setCount);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { count, refresh };
}
