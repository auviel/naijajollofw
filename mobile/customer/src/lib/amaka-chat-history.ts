import { kvGet, kvSet } from "@/lib/kv";
import {
  AMAKA_CHAT_ACTIVE_ID_KEY,
  AMAKA_CHAT_HISTORY_KEY,
  parseAmakaChatSessions,
  upsertAmakaChatSession,
  type AmakaChatSession,
} from "@/lib/amaka-chat-history-shared";

export async function loadAmakaChatSessions(): Promise<AmakaChatSession[]> {
  return parseAmakaChatSessions(await kvGet(AMAKA_CHAT_HISTORY_KEY));
}

export async function getActiveAmakaChatSessionId(): Promise<string | null> {
  return kvGet(AMAKA_CHAT_ACTIVE_ID_KEY);
}

export async function setActiveAmakaChatSessionId(id: string) {
  await kvSet(AMAKA_CHAT_ACTIVE_ID_KEY, id);
}

export async function loadActiveAmakaChatSession(): Promise<AmakaChatSession | null> {
  const sessions = await loadAmakaChatSessions();
  if (sessions.length === 0) return null;

  const activeId = await getActiveAmakaChatSessionId();
  if (activeId) {
    const active = sessions.find((session) => session.id === activeId);
    if (active && active.messages.length > 0) return active;
  }

  return sessions.find((session) => session.messages.length > 0) ?? null;
}

export async function saveAmakaChatSession(session: AmakaChatSession) {
  const sessions = upsertAmakaChatSession(await loadAmakaChatSessions(), session);
  await kvSet(AMAKA_CHAT_HISTORY_KEY, JSON.stringify(sessions));
  await setActiveAmakaChatSessionId(session.id);
}

export {
  amakaChatSessionTitle,
  formatAmakaChatWhen,
  type AmakaChatSession,
} from "@/lib/amaka-chat-history-shared";
