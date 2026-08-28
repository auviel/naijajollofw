import { kvGet, kvSet } from "@/lib/kv";
import {
  AMAKA_CHAT_HISTORY_KEY,
  parseAmakaChatSessions,
  upsertAmakaChatSession,
  type AmakaChatSession,
} from "@/lib/amaka-chat-history-shared";

export async function loadAmakaChatSessions(): Promise<AmakaChatSession[]> {
  return parseAmakaChatSessions(await kvGet(AMAKA_CHAT_HISTORY_KEY));
}

export async function saveAmakaChatSession(session: AmakaChatSession) {
  const sessions = upsertAmakaChatSession(await loadAmakaChatSessions(), session);
  await kvSet(AMAKA_CHAT_HISTORY_KEY, JSON.stringify(sessions));
}

export {
  amakaChatSessionTitle,
  formatAmakaChatWhen,
  type AmakaChatSession,
} from "@/lib/amaka-chat-history-shared";
