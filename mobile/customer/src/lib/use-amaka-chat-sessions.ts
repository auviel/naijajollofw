import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  amakaChatSessionTitle,
  formatAmakaChatWhen,
  loadAmakaChatSessions,
  saveAmakaChatSession,
  type AmakaChatSession,
} from "@/lib/amaka-chat-history";

function newSessionId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useAmakaChatSessions({
  messages,
  setMessages,
}: {
  messages: UIMessage[];
  setMessages: (
    value: UIMessage[] | ((messages: UIMessage[]) => UIMessage[]),
  ) => void;
}) {
  const [sessions, setSessions] = useState<AmakaChatSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const sessionIdRef = useRef(newSessionId());

  const refreshSessions = useCallback(async () => {
    setSessions(await loadAmakaChatSessions());
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const archiveCurrentMessages = useCallback(async () => {
    if (messages.length === 0) return;
    await saveAmakaChatSession({
      id: sessionIdRef.current,
      title: amakaChatSessionTitle(messages),
      updatedAt: Date.now(),
      messages,
    });
    await refreshSessions();
  }, [messages, refreshSessions]);

  const startNewChat = useCallback(async () => {
    await archiveCurrentMessages();
    sessionIdRef.current = newSessionId();
    setMessages([]);
    setHistoryOpen(false);
  }, [archiveCurrentMessages, setMessages]);

  const openHistory = useCallback(async () => {
    await archiveCurrentMessages();
    await refreshSessions();
    setHistoryOpen(true);
  }, [archiveCurrentMessages, refreshSessions]);

  const selectSession = useCallback(
    async (session: AmakaChatSession) => {
      await archiveCurrentMessages();
      sessionIdRef.current = session.id;
      setMessages(session.messages);
      setHistoryOpen(false);
    },
    [archiveCurrentMessages, setMessages],
  );

  const backFromHistory = useCallback(() => {
    setHistoryOpen(false);
  }, []);

  return {
    sessions,
    historyOpen,
    startNewChat,
    openHistory,
    selectSession,
    backFromHistory,
    formatWhen: formatAmakaChatWhen,
  };
}
