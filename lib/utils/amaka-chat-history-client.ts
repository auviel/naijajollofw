"use client";

import {
  AMAKA_CHAT_HISTORY_KEY,
  parseAmakaChatSessions,
  upsertAmakaChatSession,
  type AmakaChatSession,
} from "@/lib/ai/amaka-chat-history";

function readSessions(): AmakaChatSession[] {
  if (typeof window === "undefined") return [];
  return parseAmakaChatSessions(window.localStorage.getItem(AMAKA_CHAT_HISTORY_KEY));
}

function writeSessions(sessions: AmakaChatSession[]) {
  window.localStorage.setItem(AMAKA_CHAT_HISTORY_KEY, JSON.stringify(sessions));
}

export function loadAmakaChatSessions(): AmakaChatSession[] {
  return readSessions();
}

export function saveAmakaChatSession(session: AmakaChatSession) {
  writeSessions(upsertAmakaChatSession(readSessions(), session));
}

export function deleteAmakaChatSession(id: string) {
  writeSessions(readSessions().filter((session) => session.id !== id));
}
