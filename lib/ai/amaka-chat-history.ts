import type { UIMessage } from "ai";

export type AmakaChatSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

export const AMAKA_CHAT_HISTORY_KEY = "nj_amaka_chat_history";
export const AMAKA_CHAT_HISTORY_LIMIT = 20;

export function amakaChatSessionTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return "Chat";

  for (const part of firstUser.parts) {
    if (part.type !== "text") continue;
    const text = part.text.trim();
    if (!text) continue;
    return text.length > 48 ? `${text.slice(0, 48)}…` : text;
  }

  return "Chat";
}

export function formatAmakaChatWhen(updatedAt: number): string {
  const date = new Date(updatedAt);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function upsertAmakaChatSession(
  sessions: AmakaChatSession[],
  session: AmakaChatSession,
): AmakaChatSession[] {
  const without = sessions.filter((row) => row.id !== session.id);
  return [session, ...without]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, AMAKA_CHAT_HISTORY_LIMIT);
}

export function parseAmakaChatSessions(raw: string | null): AmakaChatSession[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row): row is AmakaChatSession =>
          typeof row === "object" &&
          row !== null &&
          typeof (row as AmakaChatSession).id === "string" &&
          Array.isArray((row as AmakaChatSession).messages),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, AMAKA_CHAT_HISTORY_LIMIT);
  } catch {
    return [];
  }
}
