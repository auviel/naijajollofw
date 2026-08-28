"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo } from "react";
import {
  AiChatComposer,
  AiChatMessages,
} from "@/components/features/ai/ai-chat-messages";
import {
  AmakaChatHistoryPanel,
  AmakaChatOptionsMenu,
} from "@/components/features/ai/amaka-chat-menu";
import { AmakaAvatar } from "@/components/features/ai/amaka-avatar";
import { useAmakaChatSessions } from "@/components/features/ai/use-amaka-chat-sessions";
import { X } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type AskAmakaChatShellProps = {
  className?: string;
  onClose?: () => void;
};

/** Shared Ask Amaka chat panel — full page (mobile web) or floating (desktop). */
export function AskAmakaChatShell({ className, onClose }: AskAmakaChatShellProps) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai/chat" }),
    [],
  );
  const { messages, sendMessage, setMessages, status } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  const {
    sessions,
    historyOpen,
    startNewChat,
    openHistory,
    selectSession,
    backFromHistory,
  } = useAmakaChatSessions({ messages, setMessages });

  return (
    <section
      className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-surface", className)}
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
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <AiChatMessages messages={messages} />
          </div>
          <div className="shrink-0">
            <AiChatComposer
              disabled={busy}
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
