export const AI_CHAT_MODEL = "openai/gpt-4o-mini" as const;
export const AI_CHAT_FALLBACK_MODELS = ["openai/gpt-5-mini"] as const;

export const aiChatProviderOptions = {
  gateway: {
    models: [...AI_CHAT_FALLBACK_MODELS],
  },
};
