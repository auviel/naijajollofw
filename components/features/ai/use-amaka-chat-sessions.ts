"use client";

import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  amakaChatSessionTitle,
  formatAmakaChatWhen,
  type AmakaChatSession,
} from "@/lib/ai/amaka-chat-history";
import {
  getActiveAmakaChatSessionId,
  loadActiveAmakaChatSession,
  loadAmakaChatSessions,
  saveAmakaChatSession,
  setActiveAmakaChatSessionId,
} from "@/lib/utils/amaka-chat-history-client";

function newSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `chat-${Date.now()}`;
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

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const refreshSessions = useCallback(() => {
    setSessions(loadAmakaChatSessions());
  }, []);

  const persistCurrentSession = useCallback((msgs: UIMessage[]) => {
    if (msgs.length === 0) return;
    saveAmakaChatSession({
      id: sessionIdRef.current,
      title: amakaChatSessionTitle(msgs),
      updatedAt: Date.now(),
      messages: msgs,
    });
  }, []);

  // Restore the active chat when the panel mounts.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const active = loadActiveAmakaChatSession();
    if (active) {
      sessionIdRef.current = active.id;
      setMessages(active.messages);
    } else {
      const existingActiveId = getActiveAmakaChatSessionId();
      sessionIdRef.current = existingActiveId ?? newSessionId();
      setActiveAmakaChatSessionId(sessionIdRef.current);
    }
    refreshSessions();
  }, [refreshSessions, setMessages]);

  // Auto-save as the conversation grows.
  useEffect(() => {
    if (!restoredRef.current || messages.length === 0) return;

    const timeout = window.setTimeout(() => {
      persistCurrentSession(messages);
      refreshSessions();
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [messages, persistCurrentSession, refreshSessions]);

  // Save when the chat panel unmounts (close floating chat, navigate away).
  useEffect(() => {
    return () => {
      persistCurrentSession(messagesRef.current);
    };
  }, [persistCurrentSession]);

  const archiveCurrentMessages = useCallback(() => {
    persistCurrentSession(messages);
    refreshSessions();
  }, [messages, persistCurrentSession, refreshSessions]);

  const startNewChat = useCallback(() => {
    archiveCurrentMessages();
    sessionIdRef.current = newSessionId();
    setActiveAmakaChatSessionId(sessionIdRef.current);
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
      setActiveAmakaChatSessionId(session.id);
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
