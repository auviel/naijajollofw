"use client";

import {
  AMAKA_CHAT_ACTIVE_ID_KEY,
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

export function getActiveAmakaChatSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AMAKA_CHAT_ACTIVE_ID_KEY);
}

export function setActiveAmakaChatSessionId(id: string) {
  window.localStorage.setItem(AMAKA_CHAT_ACTIVE_ID_KEY, id);
}

/** Resume the last active chat, or the most recent saved session. */
export function loadActiveAmakaChatSession(): AmakaChatSession | null {
  const sessions = readSessions();
  if (sessions.length === 0) return null;

  const activeId = getActiveAmakaChatSessionId();
  if (activeId) {
    const active = sessions.find((session) => session.id === activeId);
    if (active && active.messages.length > 0) return active;
  }

  return sessions.find((session) => session.messages.length > 0) ?? null;
}

export function saveAmakaChatSession(session: AmakaChatSession) {
  writeSessions(upsertAmakaChatSession(readSessions(), session));
  setActiveAmakaChatSessionId(session.id);
}

export function deleteAmakaChatSession(id: string) {
  writeSessions(readSessions().filter((session) => session.id !== id));
}
