import { AmakaAvatar } from "@/components/features/ai/amaka-avatar";
import type { ChatPendingLabel } from "@/lib/ai/chat-pending-state";
import { cn } from "@/lib/utils/cn";

export function AiChatTypingIndicator({ label }: { label: ChatPendingLabel }) {
  return (
    <div
      className="flex items-end gap-2"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <AmakaAvatar size="sm" className="shrink-0" />
      <div className="rounded-2xl rounded-bl-md bg-surface-elevated px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-ink-muted">{label}</span>
          <span className="inline-flex items-center gap-1" aria-hidden>
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={cn(
                  "size-1.5 rounded-full bg-accent/70",
                  "animate-bounce motion-reduce:animate-none",
                )}
                style={{ animationDelay: `${index * 140}ms` }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
