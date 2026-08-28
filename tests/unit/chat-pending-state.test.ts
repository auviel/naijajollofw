import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { getChatPendingState } from "@/lib/ai/chat-pending-state";

function assistantMessage(
  parts: UIMessage["parts"],
  id = "a1",
): UIMessage {
  return { id, role: "assistant", parts };
}

describe("getChatPendingState", () => {
  it("shows thinking while waiting for the first token", () => {
    expect(getChatPendingState("submitted", [])).toEqual({
      label: "Thinking…",
    });
  });

  it("hides once assistant text is visible", () => {
    const messages = [
      assistantMessage([{ type: "text", text: "Here you go" }]),
    ];
    expect(getChatPendingState("streaming", messages)).toBeNull();
  });

  it("shows menu check while tool output is pending", () => {
    const messages = [
      assistantMessage([
        {
          type: "tool-searchCatalog",
          toolCallId: "t1",
          state: "input-available",
          input: { query: "jollof" },
        },
      ]),
    ];
    expect(getChatPendingState("streaming", messages)).toEqual({
      label: "Checking the menu…",
    });
  });

  it("shows typing while streaming before text arrives", () => {
    const messages = [assistantMessage([])];
    expect(getChatPendingState("streaming", messages)).toEqual({
      label: "Typing…",
    });
  });
});
