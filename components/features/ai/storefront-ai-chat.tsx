"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import {
  AiChatComposer,
  AiChatMessages,
} from "@/components/features/ai/ai-chat-messages";
import { X } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

export function StorefrontAiChat() {
  const [open, setOpen] = useState(false);
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai/chat" }),
    [],
  );
  const { messages, sendMessage, status } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-end p-4 md:p-6">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {open ? (
          <section
            className={cn(
              "flex max-h-[min(70dvh,560px)] w-[min(100vw-2rem,420px)] flex-col overflow-hidden",
              "rounded-2xl border border-border bg-surface shadow-lg",
            )}
            aria-label="Ask Naija chat"
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Ask Naija</p>
                <p className="text-xs text-ink-muted">Menu help & cart assist</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-ink-muted hover:bg-surface-elevated hover:text-ink"
                aria-label="Close chat"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <AiChatMessages messages={messages} />
            </div>
            <AiChatComposer
              disabled={busy}
              onSend={(text) => {
                void sendMessage({ text });
              }}
            />
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white",
            "shadow-md transition hover:brightness-105",
          )}
          aria-expanded={open}
          aria-controls={undefined}
        >
          {open ? "Close" : "Ask Naija"}
        </button>
      </div>
    </div>
  );
}
