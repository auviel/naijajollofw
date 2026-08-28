import type { UIMessage } from "ai";

export type ChatPendingLabel = "Thinking…" | "Checking the menu…" | "Typing…";

export type ChatPendingState = {
  label: ChatPendingLabel;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getToolOutput(part: { output?: unknown }): unknown {
  return "output" in part ? part.output : undefined;
}

function getLastAssistantMessage(messages: UIMessage[]): UIMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant") {
      return message;
    }
  }
  return null;
}

function partHasVisibleContent(part: UIMessage["parts"][number]): boolean {
  if (part.type === "text") {
    return Boolean(part.text.trim());
  }

  if (!part.type.startsWith("tool-")) {
    return false;
  }

  const output = getToolOutput(part as { output?: unknown });
  if (!isRecord(output)) {
    return false;
  }

  if (part.type === "tool-searchCatalog") {
    return Array.isArray(output.items) && output.items.length > 0;
  }
  if (part.type === "tool-getProduct") {
    return typeof output.id === "string";
  }
  if (part.type === "tool-openProduct") {
    return typeof output.href === "string";
  }
  if (part.type === "tool-addToCart") {
    return (
      output.ok === true ||
      output.needsCustomize === true ||
      typeof output.error === "string"
    );
  }
  if (
    part.type === "tool-getCart" ||
    part.type === "tool-updateCartItem" ||
    part.type === "tool-removeCartItem"
  ) {
    return (
      typeof output.itemCount === "number" ||
      output.ok === true ||
      typeof output.error === "string"
    );
  }

  return false;
}

function assistantHasVisibleReply(message: UIMessage): boolean {
  return message.parts.some(partHasVisibleContent);
}

/** When to show the typing/thinking indicator below the message list. */
export function getChatPendingState(
  status: string,
  messages: UIMessage[],
): ChatPendingState | null {
  if (status !== "submitted" && status !== "streaming") {
    return null;
  }

  const lastAssistant = getLastAssistantMessage(messages);
  if (lastAssistant && assistantHasVisibleReply(lastAssistant)) {
    return null;
  }

  if (status === "submitted") {
    return { label: "Thinking…" };
  }

  const hasPendingTool = lastAssistant?.parts.some(
    (part) => part.type.startsWith("tool-") && !partHasVisibleContent(part),
  );
  if (hasPendingTool) {
    return { label: "Checking the menu…" };
  }

  return { label: "Typing…" };
}
