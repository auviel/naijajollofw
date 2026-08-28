import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const AI_CHAT_MODEL = "openai/gpt-4o-mini" as const;
export const AI_CHAT_FALLBACK_MODELS = ["openai/gpt-5-mini"] as const;

export const aiChatProviderOptions = {
  gateway: {
    models: [...AI_CHAT_FALLBACK_MODELS],
  },
};

/** Vercel AI Gateway on deploy (OIDC or AI_GATEWAY_API_KEY); direct OpenAI for local BYOK. */
export function usesAiGateway(): boolean {
  if (process.env.AI_GATEWAY_API_KEY) return true;
  if (process.env.VERCEL) return true;
  return false;
}

export function getAiChatModel(): LanguageModel {
  if (usesAiGateway()) {
    return AI_CHAT_MODEL;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return AI_CHAT_MODEL;
  }

  return createOpenAI({ apiKey })("gpt-4o-mini");
}

export function getAiChatProviderOptions() {
  return usesAiGateway() ? aiChatProviderOptions : undefined;
}
