import { kvGet, kvSet } from "@/lib/kv";

const KEY = "kitchen.insist.ack.ids";

let memory: Set<string> | null = null;
let loadPromise: Promise<Set<string>> | null = null;

async function loadAcks(): Promise<Set<string>> {
  if (memory) return memory;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await kvGet(KEY);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        const ids = Array.isArray(parsed)
          ? parsed.filter((id): id is string => typeof id === "string")
          : [];
        memory = new Set(ids);
      } catch {
        memory = new Set();
      }
      return memory;
    })().finally(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

async function persist(acks: Set<string>) {
  memory = acks;
  await kvSet(KEY, JSON.stringify([...acks]));
}

export async function isInsistAcked(orderId: string): Promise<boolean> {
  const acks = await loadAcks();
  return acks.has(orderId);
}

export async function ackInsistOrder(orderId: string): Promise<void> {
  const acks = await loadAcks();
  if (acks.has(orderId)) return;
  acks.add(orderId);
  await persist(acks);
}

/** Drop acks for tickets that are no longer due-now New. */
export async function pruneInsistAcks(
  activePendingIds: Iterable<string>,
): Promise<void> {
  const acks = await loadAcks();
  const alive = new Set(activePendingIds);
  let changed = false;
  for (const id of [...acks]) {
    if (!alive.has(id)) {
      acks.delete(id);
      changed = true;
    }
  }
  if (changed) await persist(acks);
}

export async function getInsistAckedIds(): Promise<Set<string>> {
  return new Set(await loadAcks());
}
