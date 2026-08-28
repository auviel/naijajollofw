"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AiChatComposer,
  AiChatMessages,
} from "@/components/features/ai/ai-chat-messages";
import {
  AmakaChatHistoryPanel,
  AmakaChatOptionsMenu,
} from "@/components/features/ai/amaka-chat-menu";
import { AmakaAvatar } from "@/components/features/ai/amaka-avatar";
import { AmakaChatCartBar } from "@/components/features/ai/amaka-chat-cart-bar";
import { useAmakaChatSessions } from "@/components/features/ai/use-amaka-chat-sessions";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { getChatPendingState } from "@/lib/ai/chat-pending-state";
import { X } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type AskAmakaChatShellProps = {
  className?: string;
  onClose?: () => void;
};

/** Shared Ask Amaka chat panel — full page (mobile web) or floating (desktop). */
export function AskAmakaChatShell({ className, onClose }: AskAmakaChatShellProps) {
  const { setAiChatOpen, dismissAddedToCart } = useStorefrontUi();
  const [cartRefreshKey, setCartRefreshKey] = useState(0);
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai/chat" }),
    [],
  );
  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  });
  const busy = status === "submitted" || status === "streaming";
  const pending = getChatPendingState(status, messages);
  const {
    sessions,
    historyOpen,
    startNewChat,
    openHistory,
    selectSession,
    backFromHistory,
  } = useAmakaChatSessions({ messages, setMessages });

  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAiChatOpen(true);
    dismissAddedToCart();
    return () => setAiChatOpen(false);
  }, [setAiChatOpen, dismissAddedToCart]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-surface",
        className,
      )}
      aria-label="Ask Amaka chat"
    >
      {historyOpen ? (
        <AmakaChatHistoryPanel
          sessions={sessions}
          onBack={backFromHistory}
          onSelectSession={selectSession}
        />
      ) : (
        <>
          <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <AmakaAvatar size="md" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">Ask Amaka</p>
                <p className="text-xs text-ink-muted">Menu help & cart assist</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <AmakaChatOptionsMenu
                disabled={busy}
                onNewChat={startNewChat}
                onOpenHistory={openHistory}
              />
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1.5 text-ink-muted hover:bg-surface-elevated hover:text-ink"
                  aria-label="Close chat"
                >
                  <X className="size-5" />
                </button>
              ) : null}
            </div>
          </header>
          <div
            ref={messagesRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          >
            {error ? (
              <p className="mb-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error.message || "Something went wrong. Please try again."}
              </p>
            ) : null}
            <AiChatMessages
              messages={messages}
              pending={pending}
              onCartChange={() => setCartRefreshKey((key) => key + 1)}
            />
          </div>
          <AmakaChatCartBar refreshKey={cartRefreshKey} />
          <div className="shrink-0">
            <AiChatComposer
              disabled={busy}
              pendingLabel={pending?.label}
              onSend={(text) => {
                void sendMessage({ text });
              }}
            />
          </div>
        </>
      )}
    </section>
  );
}
