import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { trimMessagesForModel } from "@/lib/ai/core/cost";
import { AI_CHAT_MODEL, aiChatProviderOptions } from "@/lib/ai/core/models";
import {
  composeAssistantPrompt,
  DEFAULT_COMMERCE_POLICIES,
} from "@/lib/ai/core/prompt";
import { createReadToolCache } from "@/lib/ai/core/tool-cache";
import { createRestaurantPorts } from "@/lib/ai/verticals/restaurant/ports";
import { RESTAURANT_VERTICAL_INSTRUCTIONS } from "@/lib/ai/verticals/restaurant/prompt";
import { createCommerceTools } from "@/lib/ai/verticals/restaurant/tools";

export async function createRestaurantChatHandler(
  req: Request,
): Promise<Response> {
  const body = (await req.json()) as { messages?: UIMessage[] };
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const trimmed = trimMessagesForModel(messages);

  const readCache = createReadToolCache({ ttlMs: 45_000 });
  const ports = createRestaurantPorts();
  const tools = createCommerceTools(ports, readCache);

  const instructions = composeAssistantPrompt({
    brandName: "Naija Jollof",
    verticalInstructions: RESTAURANT_VERTICAL_INSTRUCTIONS,
    policies: DEFAULT_COMMERCE_POLICIES,
  });

  const result = streamText({
    model: AI_CHAT_MODEL,
    providerOptions: aiChatProviderOptions,
    instructions,
    messages: await convertToModelMessages(trimmed),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
