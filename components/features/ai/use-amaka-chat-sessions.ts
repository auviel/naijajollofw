"use client";

import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  amakaChatSessionTitle,
  formatAmakaChatWhen,
  type AmakaChatSession,
} from "@/lib/ai/amaka-chat-history";
import {
  loadAmakaChatSessions,
  saveAmakaChatSession,
} from "@/lib/utils/amaka-chat-history-client";

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
  const sessionIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `chat-${Date.now()}`,
  );

  const refreshSessions = useCallback(() => {
    setSessions(loadAmakaChatSessions());
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const archiveCurrentMessages = useCallback(() => {
    if (messages.length === 0) return;
    saveAmakaChatSession({
      id: sessionIdRef.current,
      title: amakaChatSessionTitle(messages),
      updatedAt: Date.now(),
      messages,
    });
    refreshSessions();
  }, [messages, refreshSessions]);

  const startNewChat = useCallback(() => {
    archiveCurrentMessages();
    sessionIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `chat-${Date.now()}`;
    setMessages([]);
    setHistoryOpen(false);
  }, [archiveCurrentMessages, setMessages]);

  const openHistory = useCallback(() => {
    archiveCurrentMessages();
    refreshSessions();
    setHistoryOpen(true);
  }, [archiveCurrentMessages, refreshSessions]);

  const selectSession = useCallback(
    (session: AmakaChatSession) => {
      archiveCurrentMessages();
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
  };
}

export { formatAmakaChatWhen };
