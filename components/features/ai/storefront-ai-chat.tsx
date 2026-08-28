"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { AskAmakaChatShell } from "@/components/features/ai/ask-amaka-chat-shell";
import { AmakaAvatar } from "@/components/features/ai/amaka-avatar";
import { isChatPath } from "@/components/features/storefront/storefront-header-bar-gate";
import { cn } from "@/lib/utils/cn";

export function StorefrontAiChat() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  if (isChatPath(pathname)) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] hidden justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:flex md:p-6">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {open ? (
          <AskAmakaChatShell
            onClose={() => setOpen(false)}
            className={cn(
              "h-[min(78dvh,680px)] w-[min(100vw-2rem,440px)] rounded-2xl border border-border shadow-lg",
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "inline-flex items-center gap-2.5 rounded-full bg-accent py-2.5 pl-2.5 pr-4",
              "text-sm font-semibold text-white shadow-md transition hover:brightness-105",
            )}
            aria-expanded={false}
            aria-haspopup="dialog"
          >
            <AmakaAvatar size="sm" className="ring-white/30" />
            Ask Amaka
          </button>
        )}
      </div>
    </div>
  );
}
