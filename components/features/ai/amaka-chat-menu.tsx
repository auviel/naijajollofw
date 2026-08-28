"use client";

import { useEffect, useRef, useState } from "react";
import type { AmakaChatSession } from "@/lib/ai/amaka-chat-history";
import { ArrowLeft, Clock, MoreHorizontal, Plus } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

export function AmakaChatOptionsMenu({
  onNewChat,
  onOpenHistory,
  disabled,
}: {
  onNewChat: () => void;
  onOpenHistory: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="rounded-md p-1.5 text-ink-muted hover:bg-surface-elevated hover:text-ink disabled:opacity-50"
        aria-label="More options"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="size-5" />
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full z-20 mt-1 min-w-[11rem] overflow-hidden",
            "rounded-lg border border-border bg-surface py-1 shadow-lg",
          )}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-surface-elevated"
            onClick={() => {
              setOpen(false);
              onNewChat();
            }}
          >
            <Plus className="size-4 shrink-0 text-ink-muted" aria-hidden />
            New chat
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-surface-elevated"
            onClick={() => {
              setOpen(false);
              onOpenHistory();
            }}
          >
            <Clock className="size-4 shrink-0 text-ink-muted" aria-hidden />
            History
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AmakaChatHistoryPanel({
  sessions,
  onBack,
  onSelectSession,
}: {
  sessions: AmakaChatSession[];
  onBack: () => void;
  onSelectSession: (session: AmakaChatSession) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1.5 text-ink-muted hover:bg-surface-elevated hover:text-ink"
          aria-label="Back to chat"
        >
          <ArrowLeft className="size-5" />
        </button>
        <p className="text-sm font-semibold text-ink">History</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {sessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            No past chats yet. Start a conversation with Amaka.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => onSelectSession(session)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition hover:bg-surface-elevated"
                >
                  <p className="truncate text-sm font-medium text-ink">
                    {session.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {new Date(session.updatedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
