"use client";

import { useRouter } from "next/navigation";
import { AskAmakaChatShell } from "@/components/features/ai/ask-amaka-chat-shell";

export function AskAmakaChatPage() {
  const router = useRouter();

  function closeChat() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 z-10 flex flex-col bg-surface pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] md:static md:inset-auto md:min-h-[min(78dvh,680px)] md:overflow-hidden md:rounded-2xl md:border md:border-border md:pt-0 md:pb-0 md:shadow-lg">
      <AskAmakaChatShell className="h-full min-h-0" onClose={closeChat} />
    </div>
  );
}
