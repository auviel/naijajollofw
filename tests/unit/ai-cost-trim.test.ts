import { describe, expect, it } from "vitest";
import {
  AI_MODEL_HISTORY_LIMIT,
  trimMessagesForModel,
} from "@/lib/ai/core/cost";

describe("trimMessagesForModel", () => {
  it("keeps only the last N messages", () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      role: i % 2 === 0 ? "user" : "assistant",
      parts: [{ type: "text" as const, text: `m${i}` }],
    }));
    const trimmed = trimMessagesForModel(messages);
    expect(trimmed).toHaveLength(AI_MODEL_HISTORY_LIMIT);
    expect(trimmed[0]?.id).toBe(String(20 - AI_MODEL_HISTORY_LIMIT));
  });

  it("returns the same array when under the limit", () => {
    const messages = [{ id: "1" }, { id: "2" }];
    expect(trimMessagesForModel(messages)).toEqual(messages);
  });
});
