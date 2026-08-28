import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  amakaChatSessionTitle,
  formatAmakaChatWhen,
  getActiveAmakaChatSessionId,
  loadActiveAmakaChatSession,
  loadAmakaChatSessions,
  saveAmakaChatSession,
  setActiveAmakaChatSessionId,
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
  const restoredRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const refreshSessions = useCallback(async () => {
    setSessions(await loadAmakaChatSessions());
  }, []);

  const persistCurrentSession = useCallback(async (msgs: UIMessage[]) => {
    if (msgs.length === 0) return;
    await saveAmakaChatSession({
      id: sessionIdRef.current,
      title: amakaChatSessionTitle(msgs),
      updatedAt: Date.now(),
      messages: msgs,
    });
  }, []);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    void (async () => {
      const active = await loadActiveAmakaChatSession();
      if (active) {
        sessionIdRef.current = active.id;
        setMessages(active.messages);
      } else {
        const existingActiveId = await getActiveAmakaChatSessionId();
        sessionIdRef.current = existingActiveId ?? newSessionId();
        await setActiveAmakaChatSessionId(sessionIdRef.current);
      }
      await refreshSessions();
    })();
  }, [refreshSessions, setMessages]);

  useEffect(() => {
    if (!restoredRef.current || messages.length === 0) return;

    const timeout = setTimeout(() => {
      void (async () => {
        await persistCurrentSession(messages);
        await refreshSessions();
      })();
    }, 400);

    return () => clearTimeout(timeout);
  }, [messages, persistCurrentSession, refreshSessions]);

  useEffect(() => {
    return () => {
      void persistCurrentSession(messagesRef.current);
    };
  }, [persistCurrentSession]);

  const archiveCurrentMessages = useCallback(async () => {
    await persistCurrentSession(messages);
    await refreshSessions();
  }, [messages, persistCurrentSession, refreshSessions]);

  const startNewChat = useCallback(async () => {
    await archiveCurrentMessages();
    sessionIdRef.current = newSessionId();
    await setActiveAmakaChatSessionId(sessionIdRef.current);
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
      await setActiveAmakaChatSessionId(session.id);
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
