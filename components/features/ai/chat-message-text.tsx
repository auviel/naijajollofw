import { parseChatTextSegments } from "@/lib/ai/format-chat-text";
import { cn } from "@/lib/utils/cn";

export function ChatMessageText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const segments = parseChatTextSegments(text);

  return (
    <p className={cn("whitespace-pre-wrap text-sm text-ink", className)}>
      {segments.map((segment, index) =>
        segment.bold ? (
          <strong key={index} className="font-semibold">
            {segment.text}
          </strong>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}
